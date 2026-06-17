// TypeORM
import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

/**
 * @description Idempotent development fixtures for the Captura local runtime.
 *
 * Seeds a small but representative catalog so the buyer journey and search
 * surfaces (Explorer, Photographers, Hotspots) render real data end-to-end:
 * license types, photographer users + profiles, moments across communities
 * (motor / sepeda / lari) and cities, packages, reviews, and per-moment
 * license pricing.
 *
 * Privacy: full plates live in `moments.license_plate`; masking to the public
 * `masked` form is enforced at the API serialization layer, never here.
 *
 * Re-runnable: every statement upserts on a stable primary key.
 */
export default class CapturaDemoSeeder implements Seeder {
  // Shared dev credential for every seeded photographer account.
  // Plaintext: "Captura123!" — bcrypt hash (10 rounds), regenerate if rotated.
  private readonly _devPasswordHash =
    '$2b$10$yH5CR5l6ryRmDf06ojqRnuH.v3y6NeKfiBY7qT5bzAUmrjqXFlrsy';

  public async run(dataSource: DataSource): Promise<void> {
    await this._seedLicenseTypes(dataSource);
    await this._seedPhotographers(dataSource);
    await this._seedPhotographerProfiles(dataSource);
    await this._seedMoments(dataSource);
    await this._seedPhotographerPackages(dataSource);
    await this._seedPhotographerReviews(dataSource);
    await this._seedMomentLicenses(dataSource);
  }

  private async _seedLicenseTypes(dataSource: DataSource): Promise<void> {
    await dataSource.query(`
      INSERT INTO license_types (id, name, description, usage_rights, is_active)
      VALUES
        ('a0000000-0000-4000-8000-000000000001', 'Personal', 'Personal, non-commercial use', 'Credit appreciated. No resale.', true),
        ('a0000000-0000-4000-8000-000000000002', 'Editorial', 'Editorial and journalistic use', 'Credit required. Non-commercial editorial only.', true),
        ('a0000000-0000-4000-8000-000000000003', 'Commercial', 'Commercial and advertising use', 'Full commercial rights. No model release implied.', true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        usage_rights = EXCLUDED.usage_rights,
        is_active = EXCLUDED.is_active;
    `);
  }

  private async _seedPhotographers(dataSource: DataSource): Promise<void> {
    await dataSource.query(
      `
      INSERT INTO users (id, username, email, password, name, role, is_email_verified)
      VALUES
        ('b0000000-0000-4000-8000-000000000001', 'rama.pratama', 'rama@captura.test', $1, 'Rama Pratama', 'photographer', true),
        ('b0000000-0000-4000-8000-000000000002', 'sari.dewi', 'sari@captura.test', $1, 'Sari Dewi', 'photographer', true),
        ('b0000000-0000-4000-8000-000000000003', 'budi.santoso', 'budi@captura.test', $1, 'Budi Santoso', 'photographer', true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        password = EXCLUDED.password,
        is_email_verified = EXCLUDED.is_email_verified;
    `,
      [this._devPasswordHash],
    );
  }

  private async _seedPhotographerProfiles(dataSource: DataSource): Promise<void> {
    await dataSource.query(`
      INSERT INTO photographer_profiles
        (id, user_id, artist_name, slug, bio, location, joined_as_photographer_at, is_approved)
      VALUES
        ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Rama Pratama', 'rama-pratama', 'Street and motorsport photographer based in Bandung.', 'Bandung', EXTRACT(EPOCH FROM now())::bigint - 7776000, true),
        ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Sari Dewi', 'sari-dewi', 'Capturing runners and cyclists across Bogor and Depok.', 'Bogor', EXTRACT(EPOCH FROM now())::bigint - 5184000, true),
        ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Budi Santoso', 'budi-santoso', 'Documenting motor communities in Bekasi and Cirebon.', 'Bekasi', EXTRACT(EPOCH FROM now())::bigint - 2592000, true)
      ON CONFLICT (id) DO UPDATE SET
        artist_name = EXCLUDED.artist_name,
        slug = EXCLUDED.slug,
        bio = EXCLUDED.bio,
        location = EXCLUDED.location,
        is_approved = EXCLUDED.is_approved;
    `);
  }

  private async _seedMoments(dataSource: DataSource): Promise<void> {
    const motorImage =
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=70';
    const runImage =
      'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=70';
    const bikeImage =
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=70';

    await dataSource.query(
      `
      INSERT INTO moments
        (id, image_url, thumbnail_url, captured_at, caption, slug, tags, city, district,
         photographer_id, photographer_profile_id, vehicle_type, license_plate, motor_type, color, created_at, updated_at)
      VALUES
        ('d0000000-0000-4000-8000-000000000001', $1, $1, EXTRACT(EPOCH FROM now())::bigint - 86400, 'Café racer at golden hour on Braga', 'rama-braga-cafe-racer', 'motor,golden hour,braga', 'Bandung', 'Braga', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'motorcycle', 'D 1234 ABC', 'Sport', 'Red', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000002', $3, $3, EXTRACT(EPOCH FROM now())::bigint - 172800, 'Morning gowes along Dago', 'rama-dago-gowes', 'sepeda,gowes,dago', 'Bandung', 'Dago', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'bicycle', NULL, NULL, 'Blue', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000003', $1, $1, EXTRACT(EPOCH FROM now())::bigint - 259200, 'Sedan cruising Asia Afrika', 'rama-asiaafrika-sedan', 'mobil,asia afrika', 'Bandung', 'Asia Afrika', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'car', 'D 5678 XYZ', NULL, 'Black', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000004', $1, $1, EXTRACT(EPOCH FROM now())::bigint - 345600, 'Matic by Kebun Raya gates', 'sari-kebonraya-matic', 'motor,kebun raya,bogor', 'Bogor', 'Kebun Raya', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'motorcycle', 'F 4321 GH', 'Matic', 'White', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000005', $2, $2, EXTRACT(EPOCH FROM now())::bigint - 432000, 'Half-marathon finish in Bogor', 'sari-bogor-marathon', 'lari,marathon,bogor', 'Bogor', 'Sempur', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'other', NULL, NULL, NULL, EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000006', $1, $1, EXTRACT(EPOCH FROM now())::bigint - 518400, 'Commuter on Margonda', 'sari-depok-margonda', 'motor,depok,margonda', 'Depok', 'Margonda', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'motorcycle', 'B 9988 KK', 'Naked', 'Blue', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000007', $1, $1, EXTRACT(EPOCH FROM now())::bigint - 604800, 'Sport bike in Bekasi sunset', 'budi-bekasi-sport', 'motor,bekasi,sunset', 'Bekasi', 'Bekasi Selatan', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'motorcycle', 'B 1234 XX', 'Sport', 'Green', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000008', $3, $3, EXTRACT(EPOCH FROM now())::bigint - 691200, 'Weekend roll in Bekasi', 'budi-bekasi-sepeda', 'sepeda,bekasi', 'Bekasi', 'Bekasi Timur', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'bicycle', NULL, NULL, 'Black', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000009', $1, $1, EXTRACT(EPOCH FROM now())::bigint - 777600, 'Classic car in Cirebon', 'budi-cirebon-classic', 'mobil,cirebon', 'Cirebon', 'Kejaksan', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'car', 'E 2468 LM', NULL, 'Silver', EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint),
        ('d0000000-0000-4000-8000-000000000010', $2, $2, EXTRACT(EPOCH FROM now())::bigint - 864000, 'Trail run above Lembang', 'rama-lembang-trail', 'lari,trail,lembang', 'Bandung Barat', 'Lembang', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'other', NULL, NULL, NULL, EXTRACT(EPOCH FROM now())::bigint, EXTRACT(EPOCH FROM now())::bigint)
      ON CONFLICT (id) DO UPDATE SET
        image_url = EXCLUDED.image_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        caption = EXCLUDED.caption,
        tags = EXCLUDED.tags,
        city = EXCLUDED.city,
        district = EXCLUDED.district,
        vehicle_type = EXCLUDED.vehicle_type,
        license_plate = EXCLUDED.license_plate,
        motor_type = EXCLUDED.motor_type,
        color = EXCLUDED.color;
    `,
      [motorImage, runImage, bikeImage],
    );
  }

  private async _seedPhotographerPackages(dataSource: DataSource): Promise<void> {
    await dataSource.query(`
      INSERT INTO photographer_packages
        (id, photographer_profile_id, name, price, currency, duration, description, includes, is_active)
      VALUES
        ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Personal walk', 450000, 'IDR', '60 minutes', 'One-on-one street session with 20 edited photos.', '20 edited photos,1 location,online gallery', true),
        ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Community ride', 900000, 'IDR', '2 hours', 'Coverage for motor or cycling community rides.', '60 edited photos,multi-rider,online gallery', true),
        ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'Race day', 750000, 'IDR', '90 minutes', 'Finish-line and route coverage for runners.', '40 edited photos,bib matching,fast delivery', true),
        ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'Personal walk', 400000, 'IDR', '60 minutes', 'Relaxed personal portrait walk.', '15 edited photos,1 location', true),
        ('e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003', 'Motor feature', 600000, 'IDR', '75 minutes', 'Featured shoot for one motorcycle build.', '25 edited photos,detail shots', true),
        ('e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'Community ride', 950000, 'IDR', '2 hours', 'Full coverage for motor community events.', '70 edited photos,multi-rider', true)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        duration = EXCLUDED.duration,
        description = EXCLUDED.description,
        includes = EXCLUDED.includes,
        is_active = EXCLUDED.is_active;
    `);
  }

  private async _seedPhotographerReviews(dataSource: DataSource): Promise<void> {
    await dataSource.query(`
      INSERT INTO photographer_reviews
        (id, photographer_profile_id, reviewer_user_id, author_name, context, rating, quote, is_published)
      VALUES
        ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', NULL, 'Adit R.', 'Community ride · April 2026', 5, 'Found every shot of my bike instantly. Quality is unreal.', true),
        ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', NULL, 'Maya S.', 'Personal walk · March 2026', 5, 'Calm, fast, and the edits are gorgeous.', true),
        ('f0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', NULL, 'Dimas P.', 'Race day · May 2026', 4, 'Got my finish-line photo by bib number. Loved it.', true),
        ('f0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', NULL, 'Nadia L.', 'Personal walk · February 2026', 5, 'Made me feel comfortable the whole session.', true),
        ('f0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003', NULL, 'Rizky F.', 'Motor feature · May 2026', 5, 'Detail shots of my build were museum quality.', true),
        ('f0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', NULL, 'Tari W.', 'Community ride · April 2026', 4, 'Great coverage of our weekend ride.', true)
      ON CONFLICT (id) DO UPDATE SET
        author_name = EXCLUDED.author_name,
        context = EXCLUDED.context,
        rating = EXCLUDED.rating,
        quote = EXCLUDED.quote,
        is_published = EXCLUDED.is_published;
    `);
  }

  private async _seedMomentLicenses(dataSource: DataSource): Promise<void> {
    await dataSource.query(`
      INSERT INTO moment_licenses (id, moment_id, license_type_id, price, currency, is_active)
      VALUES
        ('1a000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 25000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 150000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 25000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 75000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 25000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 30000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 25000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', 150000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 25000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000002', 75000, 'IDR', true),
        ('1a000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 30000, 'IDR', true)
      ON CONFLICT (id) DO UPDATE SET
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        is_active = EXCLUDED.is_active;
    `);
  }
}
