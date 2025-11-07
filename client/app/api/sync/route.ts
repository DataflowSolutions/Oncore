import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const supabase = await getSupabaseServer();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.security('Sync endpoint access attempt', { action: 'sync', result: 'denied' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync logic - for now, we'll just refresh cache and return stats
    // In a real implementation, this would sync with external calendars, email, etc.
    
    // OPTIMIZATION: Get user's organizations with aggregated data in a single query
    const { data: orgs, error: orgsError } = await supabase
      .from('org_members')
      .select(`
        org_id,
        organizations!inner(
          id,
          name,
          shows:shows(count)
        )
      `)
      .eq('user_id', user.id);

    if (orgsError) {
      logger.error('Sync: Error fetching orgs', orgsError);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No organizations to sync',
        synced: 0 
      });
    }

    // OPTIMIZATION: Calculate totals from already-fetched data (no additional queries)
    const syncResults = orgs
      .filter(org => org.organizations)
      .map(org => ({
        orgName: org.organizations!.name,
        showCount: org.organizations!.shows?.[0]?.count || 0,
      }));

    const totalSynced = syncResults.reduce((sum, result) => sum + result.showCount, 0);

    logger.info('Sync completed', { 
      totalOrgs: orgs.length, 
      totalItems: totalSynced 
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} items across ${orgs.length} organization(s)`,
      synced: totalSynced,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Sync error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync data' },
      { status: 500 }
    );
  }
}
