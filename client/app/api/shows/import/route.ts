import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const orgId = formData.get('orgId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization ID provided' }, { status: 400 });
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

    // Read file content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'File is empty or invalid' }, { status: 400 });
    }

    // Parse CSV header - handle both comma and semicolon separators
    let separator = ',';
    if (lines[0].includes(';') && !lines[0].includes(',')) {
      separator = ';';
    } else if (lines[0].split(';').length > lines[0].split(',').length) {
      separator = ';';
    }

    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    // Check for required fields with flexible matching
    const requiredFields = ['show', 'date', 'venue', 'artist'];
    const hasRequiredFields = requiredFields.every(field => 
      headers.some(h => h.includes(field))
    );

    if (!hasRequiredFields) {
      return NextResponse.json({ 
        error: `Unable to parse file format. Expected columns containing: ${requiredFields.join(', ')}`,
        hint: 'AI-powered parsing coming soon! For now, please use standard CSV format.',
        receivedHeaders: headers
      }, { status: 400 });
    }

    // OPTIMIZATION: Parse all rows first
    interface ParsedRow {
      rowNum: number
      showName: string
      date: string
      venueName: string
      city: string | null
      artistName: string
      performanceTime: string
      notes: string | null
    }
    
    const parsedRows: ParsedRow[] = [];
    const parseErrors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(separator).map(v => v.trim().replace(/['"]/g, ''));
        const row: Record<string, string> = {};
        
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        const showName = row['show name'] || row['show'] || row['showname'] || row['title'] || row['name'];
        const date = row['date'] || row['performance date'] || row['performancedate'] || row['show date'];
        const venueName = row['venue'] || row['venue name'] || row['venuename'] || row['location'];
        const city = row['city'] || row['venue city'] || row['location city'];
        const artistName = row['artist'] || row['artist name'] || row['artistname'] || row['performer'];
        const performanceTime = row['performance time'] || row['set time'] || row['settime'] || row['time'] || '20:00';
        const notes = row['notes'] || row['crew requirements'] || row['description'] || '';

        if (!showName || !date || !venueName || !artistName) {
          parseErrors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        const showDate = new Date(date);
        if (isNaN(showDate.getTime())) {
          parseErrors.push(`Row ${i + 1}: Invalid date format`);
          continue;
        }

        parsedRows.push({
          rowNum: i + 1,
          showName,
          date: showDate.toISOString().split('T')[0],
          venueName,
          city: city || null,
          artistName,
          performanceTime,
          notes: notes || null,
        });
      } catch (error) {
        parseErrors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }

    if (parsedRows.length === 0) {
      return NextResponse.json({ 
        error: 'No valid rows to import',
        errors: parseErrors 
      }, { status: 400 });
    }

    // OPTIMIZATION: Batch fetch existing venues (1 query instead of N)
    const uniqueVenueNames = [...new Set(parsedRows.map(r => r.venueName))];
    const { data: existingVenues } = await supabase
      .from('venues')
      .select('id, name')
      .eq('org_id', orgId)
      .in('name', uniqueVenueNames);

    const venueMap = new Map(existingVenues?.map(v => [v.name, v.id]) || []);

    // OPTIMIZATION: Batch create missing venues (1 upsert instead of N inserts)
    const venuesToCreate = parsedRows
      .filter(r => !venueMap.has(r.venueName))
      .map(r => ({ name: r.venueName, city: r.city, org_id: orgId }));
    
    // Remove duplicates
    const uniqueVenues = Array.from(
      new Map(venuesToCreate.map(v => [v.name, v])).values()
    );

    if (uniqueVenues.length > 0) {
      const { data: newVenues, error: venueError } = await supabase
        .from('venues')
        .upsert(uniqueVenues, { onConflict: 'org_id,name', ignoreDuplicates: false })
        .select('id, name');

      if (venueError) {
        logger.error('Error creating venues', venueError);
        return NextResponse.json({ 
          error: `Failed to create venues: ${venueError.message}` 
        }, { status: 500 });
      }

      // Update venue map with new venues
      newVenues?.forEach(v => venueMap.set(v.name, v.id));
    }

    // OPTIMIZATION: Batch fetch existing artists (1 query instead of N)
    const uniqueArtistNames = [...new Set(parsedRows.map(r => r.artistName))];
    const { data: existingArtists } = await supabase
      .from('people')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('member_type', 'Artist')
      .in('name', uniqueArtistNames);

    const artistMap = new Map(existingArtists?.map(a => [a.name, a.id]) || []);

    // OPTIMIZATION: Batch create missing artists (1 upsert instead of N inserts)
    const artistsToCreate = parsedRows
      .filter(r => !artistMap.has(r.artistName))
      .map(r => ({ name: r.artistName, org_id: orgId, member_type: 'Artist' as const }));
    
    // Remove duplicates
    const uniqueArtists = Array.from(
      new Map(artistsToCreate.map(a => [a.name, a])).values()
    );

    if (uniqueArtists.length > 0) {
      const { data: newArtists, error: artistError } = await supabase
        .from('people')
        .upsert(uniqueArtists, { onConflict: 'org_id,name,member_type', ignoreDuplicates: false })
        .select('id, name');

      if (artistError) {
        logger.error('Error creating artists', artistError);
        return NextResponse.json({ 
          error: `Failed to create artists: ${artistError.message}` 
        }, { status: 500 });
      }

      // Update artist map with new artists
      newArtists?.forEach(a => artistMap.set(a.name, a.id));
    }

    // OPTIMIZATION: Batch create shows (1 insert instead of N)
    const showsToCreate = parsedRows.map(r => ({
      title: r.showName,
      date: r.date,
      venue_id: venueMap.get(r.venueName)!,
      org_id: orgId,
      set_time: `${r.date}T${r.performanceTime}:00`,
      status: 'confirmed' as const,
      notes: r.notes,
    }));

    const { data: createdShows, error: showsError } = await supabase
      .from('shows')
      .insert(showsToCreate)
      .select('id');

    if (showsError) {
      logger.error('Error creating shows', showsError);
      return NextResponse.json({ 
        error: `Failed to create shows: ${showsError.message}` 
      }, { status: 500 });
    }

    // OPTIMIZATION: Batch create assignments (1 insert instead of N)
    const assignments = createdShows?.map((show, idx) => ({
      show_id: show.id,
      person_id: artistMap.get(parsedRows[idx].artistName)!,
      duty: 'Performer',
    })) || [];

    const { error: assignmentsError } = await supabase
      .from('show_assignments')
      .insert(assignments);

    if (assignmentsError) {
      logger.warn('Error creating assignments', assignmentsError);
      // Don't fail the import if assignments fail
    }

    return NextResponse.json({
      success: true,
      imported: createdShows?.length || 0,
      errors: parseErrors.length > 0 ? parseErrors : null,
      message: `Successfully imported ${createdShows?.length || 0} show(s)${parseErrors.length > 0 ? ` (${parseErrors.length} rows skipped)` : ''}`,
    });

  } catch (error) {
    logger.error('Import error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import data' },
      { status: 500 }
    );
  }
}
