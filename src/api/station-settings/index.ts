import { Hono } from 'hono';
import { database } from '../database';
import { stationSettings } from '../database/schema';
import { eq } from 'drizzle-orm';

const app = new Hono().basePath('/api/station-settings');

/**
 * GET /api/station-settings
 * Get all station settings for current user
 */
app.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userSettings = await database
      .select()
      .from(stationSettings)
      .where(eq(stationSettings.user_id, userId));

    if (userSettings.length === 0) {
      return c.json({
        message: 'No settings found. Create one with POST.',
        settings: null,
      });
    }

    return c.json({
      settings: userSettings[0],
    });
  } catch (error) {
    console.error('Error fetching station settings:', error);
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

/**
 * POST /api/station-settings
 * Create initial station settings
 */
app.post('/', async (c) => {
  try {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json<any>();

    // Validate required fields (from Station Identity section)
    if (!body.station_name || !body.country || !body.city_region || !body.primary_language) {
      return c.json(
        {
          error: 'Missing required fields: station_name, country, city_region, primary_language',
        },
        400
      );
    }

    if (!body.primary_contact_name || !body.primary_contact_email) {
      return c.json(
        {
          error: 'Missing required fields: primary_contact_name, primary_contact_email',
        },
        400
      );
    }

    // Check if settings already exist
    const existing = await database
      .select()
      .from(stationSettings)
      .where(eq(stationSettings.user_id, userId));

    if (existing.length > 0) {
      return c.json(
        { error: 'Settings already exist for this user. Use PATCH to update.' },
        409
      );
    }

    // Create settings
    const now = new Date().toISOString();
    const [newSettings] = await database
      .insert(stationSettings)
      .values({
        user_id: userId,
        station_name: body.station_name,
        station_call_sign: body.station_call_sign || null,
        country: body.country,
        city_region: body.city_region,
        broadcast_type: body.broadcast_type || null,
        primary_language: body.primary_language,

        audio_format: body.audio_format || null,
        bitrate: body.bitrate || null,
        loudness_standard: body.loudness_standard || '-16 LUFS',
        is_stereo: body.is_stereo !== undefined ? body.is_stereo : true,
        file_naming_preference: body.file_naming_preference || null,
        time_zone: body.time_zone || null,
        air_days: body.air_days ? JSON.stringify(body.air_days) : null,
        air_time_start: body.air_time_start || null,
        air_time_end: body.air_time_end || null,
        is_live: body.is_live || false,
        usage_type: body.usage_type || null,

        logo_dark_url: body.logo_dark_url || null,
        logo_light_url: body.logo_light_url || null,
        station_tagline: body.station_tagline || null,
        voice_style: body.voice_style || null,
        pronunciation_notes: body.pronunciation_notes || null,

        primary_contact_name: body.primary_contact_name,
        primary_contact_email: body.primary_contact_email,
        primary_contact_role: body.primary_contact_role || null,
        billing_contact_name: body.billing_contact_name || null,
        billing_contact_email: body.billing_contact_email || null,

        license_confirmed: body.license_confirmed || false,
        station_website: body.station_website || null,

        created_at: now,
        updated_at: now,
        identity_updated_at: now,
        preferences_updated_at: now,
        branding_updated_at: now,
        contacts_updated_at: now,
        licensing_updated_at: now,
      })
      .returning();

    return c.json({
      success: true,
      settings: newSettings,
    });
  } catch (error) {
    console.error('Error creating station settings:', error);
    return c.json(
      {
        error: 'Failed to create settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PATCH /api/station-settings/:section
 * Update a specific section of station settings
 */
app.patch('/:section', async (c) => {
  try {
    const userId = c.get('userId') as string | undefined;
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const section = c.req.param('section');
    const validSections = ['identity', 'preferences', 'branding', 'contacts', 'licensing'];

    if (!validSections.includes(section)) {
      return c.json(
        { error: `Invalid section. Must be one of: ${validSections.join(', ')}` },
        400
      );
    }

    const body = await c.req.json<any>();

    // Get current settings
    const [current] = await database
      .select()
      .from(stationSettings)
      .where(eq(stationSettings.user_id, userId));

    if (!current) {
      return c.json(
        { error: 'Settings not found. Create them first with POST.' },
        404
      );
    }

    // Build update object based on section
    const now = new Date().toISOString();
    let updateData: any = {
      updated_at: now,
    };

    // Section-specific timestamp
    const sectionTimestampKey = `${section}_updated_at`;
    updateData[sectionTimestampKey] = now;

    // Map section to fields
    if (section === 'identity') {
      updateData = {
        ...updateData,
        station_name: body.station_name || current.station_name,
        station_call_sign: body.station_call_sign ?? current.station_call_sign,
        country: body.country || current.country,
        city_region: body.city_region || current.city_region,
        broadcast_type: body.broadcast_type ?? current.broadcast_type,
        primary_language: body.primary_language || current.primary_language,
      };
    } else if (section === 'preferences') {
      updateData = {
        ...updateData,
        audio_format: body.audio_format ?? current.audio_format,
        bitrate: body.bitrate ?? current.bitrate,
        loudness_standard: body.loudness_standard || current.loudness_standard,
        is_stereo: body.is_stereo !== undefined ? body.is_stereo : current.is_stereo,
        file_naming_preference: body.file_naming_preference ?? current.file_naming_preference,
        time_zone: body.time_zone ?? current.time_zone,
        air_days: body.air_days ? JSON.stringify(body.air_days) : current.air_days,
        air_time_start: body.air_time_start ?? current.air_time_start,
        air_time_end: body.air_time_end ?? current.air_time_end,
        is_live: body.is_live !== undefined ? body.is_live : current.is_live,
        usage_type: body.usage_type ?? current.usage_type,
      };
    } else if (section === 'branding') {
      updateData = {
        ...updateData,
        logo_dark_url: body.logo_dark_url ?? current.logo_dark_url,
        logo_light_url: body.logo_light_url ?? current.logo_light_url,
        station_tagline: body.station_tagline ?? current.station_tagline,
        voice_style: body.voice_style ?? current.voice_style,
        pronunciation_notes: body.pronunciation_notes ?? current.pronunciation_notes,
      };
    } else if (section === 'contacts') {
      updateData = {
        ...updateData,
        primary_contact_name: body.primary_contact_name || current.primary_contact_name,
        primary_contact_email: body.primary_contact_email || current.primary_contact_email,
        primary_contact_role: body.primary_contact_role ?? current.primary_contact_role,
        billing_contact_name: body.billing_contact_name ?? current.billing_contact_name,
        billing_contact_email: body.billing_contact_email ?? current.billing_contact_email,
      };
    } else if (section === 'licensing') {
      updateData = {
        ...updateData,
        license_confirmed: body.license_confirmed !== undefined ? body.license_confirmed : current.license_confirmed,
        station_website: body.station_website ?? current.station_website,
      };
    }

    // Update settings
    const [updated] = await database
      .update(stationSettings)
      .set(updateData)
      .where(eq(stationSettings.user_id, userId))
      .returning();

    return c.json({
      success: true,
      section: section,
      settings: updated,
      message: `${section} settings updated successfully`,
    });
  } catch (error) {
    console.error('Error updating station settings:', error);
    return c.json(
      {
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
