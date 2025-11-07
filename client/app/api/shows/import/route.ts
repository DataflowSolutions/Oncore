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
      // TODO: Future feature - Use AI to parse unstructured data
      // For now, return helpful error message
      return NextResponse.json({ 
        error: `Unable to parse file format. Expected columns containing: ${requiredFields.join(', ')}`,
        hint: 'AI-powered parsing coming soon! For now, please use standard CSV format.',
        receivedHeaders: headers
      }, { status: 400 });
    }

    const importedShows = [];
    const errors = [];

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(separator).map(v => v.trim().replace(/['"]/g, ''));
        const row: Record<string, string> = {};
        
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        // Extract data with flexible field matching
        const showName = row['show name'] || row['show'] || row['showname'] || row['title'] || row['name'];
        const date = row['date'] || row['performance date'] || row['performancedate'] || row['show date'];
        const venueName = row['venue'] || row['venue name'] || row['venuename'] || row['location'];
        const city = row['city'] || row['venue city'] || row['location city'];
        const artistName = row['artist'] || row['artist name'] || row['artistname'] || row['performer'];
        const performanceTime = row['performance time'] || row['set time'] || row['settime'] || row['time'] || '20:00';
        const notes = row['notes'] || row['crew requirements'] || row['description'] || '';

        if (!showName || !date || !venueName || !artistName) {
          errors.push(`Row ${i + 1}: Missing required fields (show: ${!!showName}, date: ${!!date}, venue: ${!!venueName}, artist: ${!!artistName})`);
          continue;
        }

        // Find or create venue
        const { data: existingVenue } = await supabase
          .from('venues')
          .select('id')
          .eq('name', venueName)
          .eq('org_id', orgId)
          .single();

        let venueId = existingVenue?.id;

        if (!venueId) {
          const { data: newVenue, error: venueError } = await supabase
            .from('venues')
            .insert({
              name: venueName,
              city: city || null,
              org_id: orgId,
            })
            .select('id')
            .single();

          if (venueError) {
            errors.push(`Row ${i + 1}: Failed to create venue - ${venueError.message}`);
            continue;
          }
          venueId = newVenue.id;
        }

        // Find or create artist
        const { data: existingArtist } = await supabase
          .from('people')
          .select('id')
          .eq('name', artistName)
          .eq('org_id', orgId)
          .eq('member_type', 'Artist')
          .single();

        let artistId = existingArtist?.id;

        if (!artistId) {
          const { data: newArtist, error: artistError } = await supabase
            .from('people')
            .insert({
              name: artistName,
              org_id: orgId,
              member_type: 'Artist',
            })
            .select('id')
            .single();

          if (artistError) {
            errors.push(`Row ${i + 1}: Failed to create artist - ${artistError.message}`);
            continue;
          }
          artistId = newArtist.id;
        }

        // Parse date
        const showDate = new Date(date);
        if (isNaN(showDate.getTime())) {
          errors.push(`Row ${i + 1}: Invalid date format`);
          continue;
        }

        // Create show
        const { data: newShow, error: showError } = await supabase
          .from('shows')
          .insert({
            title: showName,
            date: showDate.toISOString().split('T')[0],
            venue_id: venueId,
            org_id: orgId,
            set_time: `${showDate.toISOString().split('T')[0]}T${performanceTime}:00`,
            status: 'confirmed',
            notes: notes || null,
          })
          .select('id')
          .single();

        if (showError) {
          errors.push(`Row ${i + 1}: Failed to create show - ${showError.message}`);
          continue;
        }

        // Assign artist to show
        await supabase
          .from('show_assignments')
          .insert({
            show_id: newShow.id,
            person_id: artistId,
            duty: 'Performer',
          });

        importedShows.push(newShow.id);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedShows.length,
      errors: errors.length > 0 ? errors : null,
      message: `Successfully imported ${importedShows.length} show(s)${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`,
    });

  } catch (error) {
    logger.error('Import error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import data' },
      { status: 500 }
    );
  }
}
