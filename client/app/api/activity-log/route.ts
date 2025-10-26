import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const dateFilter = searchParams.get('date') || 'all';
    const resourceType = searchParams.get('resourceType') || 'all';
    const userId = searchParams.get('userId') || 'all';

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    const supabase = await getSupabaseServer();
    
    // Verify user has access to this org
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized - Not a member of this organization' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      query = query.gte('created_at', startDate.toISOString());
    }

    // Apply resource type filter
    if (resourceType !== 'all') {
      query = query.eq('resource_type', resourceType);
    }

    // Apply user filter
    if (userId !== 'all') {
      query = query.eq('user_id', userId);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching activity logs:', error);
      return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
    }

    // Get unique user IDs to fetch user emails
    const { data: users } = await supabase.auth.admin.listUsers();
    const userMap = new Map(users?.users.map(u => [u.id, u.email]) || []);

    // Format the logs for display
    const formattedLogs = logs?.map(log => {
      const date = new Date(log.created_at);
      return {
        id: log.id,
        date: date.toISOString().split('T')[0],
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        user: log.user_id ? (userMap.get(log.user_id) || 'Unknown User') : 'System',
        userId: log.user_id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        details: log.details,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      total: formattedLogs.length,
    });

  } catch (error) {
    console.error('Activity log error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
