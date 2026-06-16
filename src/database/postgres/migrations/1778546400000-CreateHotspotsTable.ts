// TypeORM
import type { MigrationInterface, QueryRunner } from 'typeorm';

interface IHotspotSeed {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  title: string;
  meta: string;
  description: string;
  heroImageUrl: string;
  bestTimeLabel: string;
  bestTimeWindow: string;
  popularTags: string[];
  areaKeywords: string[];
  isDefault: boolean;
}

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

const HOTSPOT_SEED: IHotspotSeed[] = [
  {
    slug: 'braga',
    name: 'Braga, Bandung',
    lat: -6.9175,
    lng: 107.6098,
    title: 'Braga, Bandung — <em>colonial heart</em>.',
    meta: 'The colonial stretch of Jalan Braga, where golden hour folds into the old awnings.',
    description:
      'Colonial-era façades, slow afternoon traffic, and a steady stream of street style. Photographers favor the awning shade between Jalan Braga and Jalan Naripan, where golden hour bounces off the old shopfronts.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Golden hour',
    bestTimeWindow: '17:00 – 18:30',
    popularTags: ['red jacket', 'vespa', 'on foot', 'colonial facade'],
    areaKeywords: ['braga', 'bandung'],
    isDefault: true,
  },
  {
    slug: 'asia-afrika',
    name: 'Asia Afrika',
    lat: -6.9217,
    lng: 107.6094,
    title: 'Asia Afrika, Bandung — <em>heritage corridor</em>.',
    meta: 'Heritage façades and the wide boulevard in front of Hotel Savoy Homann.',
    description:
      'Heritage façades and the wide pedestrian boulevard in front of Hotel Savoy Homann make Asia Afrika a steady weekday corridor. Morning light favors the eastern sidewalk; by evening, the strip lights up for the night market crowd.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Early morning',
    bestTimeWindow: '07:00 – 08:30',
    popularTags: ['heritage facade', 'motorbike', 'crowd', 'night market'],
    areaKeywords: ['asia afrika', 'bandung'],
    isDefault: false,
  },
  {
    slug: 'dago',
    name: 'Dago',
    lat: -6.8852,
    lng: 107.6131,
    title: 'Dago — <em>café-side</em>.',
    meta: 'An uphill run of cafés and boutiques along Ir. H. Juanda.',
    description:
      'An uphill stretch of cafés and boutiques along Ir. H. Juanda. The late lunch crowd brings a steady flow of motorbikes parked in rows, with soft diffused light filtering through the trees most of the afternoon.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Late lunch',
    bestTimeWindow: '12:30 – 14:00',
    popularTags: ['cafe', 'motorbike row', 'boutique', 'uphill'],
    areaKeywords: ['dago', 'bandung'],
    isDefault: false,
  },
  {
    slug: 'lembang',
    name: 'Lembang',
    lat: -6.8125,
    lng: 107.6172,
    title: 'Lembang — <em>cool light</em>.',
    meta: 'Mountain air and mist drifting off the strawberry fields.',
    description:
      'Mountain air and mist drifting off the strawberry fields. The market road fills early with produce trucks and motorbike convoys before the day-trip crowd arrives mid-morning.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Cool morning',
    bestTimeWindow: '06:00 – 08:00',
    popularTags: ['mist', 'motorbike convoy', 'market road', 'strawberry field'],
    areaKeywords: ['lembang'],
    isDefault: false,
  },
  {
    slug: 'cihampelas',
    name: 'Cihampelas',
    lat: -6.895,
    lng: 107.6045,
    title: 'Cihampelas — <em>almost evening</em>.',
    meta: 'The skywalk under sodium light, denim shops blinking on.',
    description:
      'The Cihampelas skywalk under sodium light, with denim shops blinking on as evening sets in. Pedestrian traffic on the bridge picks up sharply after sunset.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1558980664-1ee79b51c4cb?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Blue hour',
    bestTimeWindow: '18:30 – 19:30',
    popularTags: ['skywalk', 'neon', 'denim shop', 'pedestrian bridge'],
    areaKeywords: ['cihampelas', 'bandung'],
    isDefault: false,
  },
  {
    slug: 'kebon-raya',
    name: 'Kebun Raya, Bogor',
    lat: -6.5971,
    lng: 106.799,
    title: 'Kebun Raya, Bogor — <em>green and hush</em>.',
    meta: 'The botanical garden in late light, orchid house at the entrance.',
    description:
      "Bogor's botanical garden in late afternoon light. The orchid house entrance draws a steady trickle of visitors, with long shadows across the lawns by golden hour.",
    heroImageUrl:
      'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Golden hour',
    bestTimeWindow: '16:30 – 17:45',
    popularTags: ['orchid house', 'garden path', 'long shadow', 'visitors'],
    areaKeywords: ['kebun raya', 'kebon raya', 'bogor'],
    isDefault: false,
  },
  {
    slug: 'puncak',
    name: 'Puncak Pass',
    lat: -6.7,
    lng: 106.9833,
    title: 'Puncak Pass — <em>tea slope evening</em>.',
    meta: 'Tea hills and motorbikes coasting through fog.',
    description:
      'Tea hills along Puncak Pass, with motorbikes coasting through fog as evening settles in. The lookout point gathers a small but steady crowd at sunset.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Foggy evening',
    bestTimeWindow: '17:30 – 18:30',
    popularTags: ['tea hill', 'fog', 'lookout', 'motorbike'],
    areaKeywords: ['puncak', 'cisarua'],
    isDefault: false,
  },
  {
    slug: 'bekasi',
    name: 'Bekasi Centro',
    lat: -6.2383,
    lng: 106.9756,
    title: 'Bekasi Centro — <em>plaza evenings</em>.',
    meta: 'A plaza that picks up foot traffic at dusk.',
    description:
      'Bekasi Centro stays thin through the afternoon and picks up at dusk when foot traffic builds around the plaza.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Dusk',
    bestTimeWindow: '18:00 – 19:00',
    popularTags: ['plaza', 'foot traffic', 'evening'],
    areaKeywords: ['bekasi'],
    isDefault: false,
  },
  {
    slug: 'cirebon',
    name: 'Cirebon Old Town',
    lat: -6.732,
    lng: 108.5523,
    title: 'Cirebon Old Town — <em>coastal calm</em>.',
    meta: 'Coastal calm around the kraton gates.',
    description:
      'Coastal calm around the kraton. Cirebon Old Town stays quiet most of the day, with brief activity near the kraton gates in the morning.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Morning',
    bestTimeWindow: '08:00 – 09:30',
    popularTags: ['kraton', 'coastal', 'old town'],
    areaKeywords: ['cirebon'],
    isDefault: false,
  },
  {
    slug: 'sukabumi',
    name: 'Sukabumi',
    lat: -6.9277,
    lng: 106.93,
    title: 'Sukabumi — <em>sleepy outskirts</em>.',
    meta: 'Light, irregular coverage along the main road.',
    description: "Sleepy outskirts with light, irregular coverage along Sukabumi's main road.",
    heroImageUrl:
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Mid-morning',
    bestTimeWindow: '09:00 – 10:30',
    popularTags: ['main road', 'outskirts'],
    areaKeywords: ['sukabumi'],
    isDefault: false,
  },
  {
    slug: 'depok',
    name: 'Margonda, Depok',
    lat: -6.3927,
    lng: 106.8224,
    title: 'Margonda, Depok — <em>weekday hush</em>.',
    meta: 'Long shadows across the campus blocks along Margonda.',
    description:
      'Long shadows across the campus blocks along Margonda. Weekday afternoons stay hushed compared to Jakarta proper.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1561361398-a8b5b3a3c1d3?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Late afternoon',
    bestTimeWindow: '15:30 – 16:30',
    popularTags: ['campus', 'margonda', 'long shadow'],
    areaKeywords: ['depok', 'margonda'],
    isDefault: false,
  },
  {
    slug: 'tasik',
    name: 'Tasikmalaya',
    lat: -7.3274,
    lng: 108.2207,
    title: 'Tasikmalaya — <em>far edge</em>.',
    meta: 'Quiet streets near the alun-alun, fullest on weekends.',
    description:
      "Quiet streets near the alun-alun — Captura's farthest edge in Jawa Barat. Coverage is sparse but the square fills up on weekends.",
    heroImageUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1400&q=80&auto=format&fit=crop',
    bestTimeLabel: 'Weekend morning',
    bestTimeWindow: '07:00 – 09:00',
    popularTags: ['alun-alun', 'weekend', 'far edge'],
    areaKeywords: ['tasikmalaya', 'tasik'],
    isDefault: false,
  },
];

/**
 * Creates the curated `hotspots` table and seeds the initial Jawa Barat areas.
 * Live activity stats are NOT stored here — they are aggregated from `moments`
 * at read time by `HotspotsService`.
 */
export class CreateHotspotsTable1778546400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hotspots" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "slug" VARCHAR(140) NOT NULL,
        "name" VARCHAR(140) NOT NULL,
        "region" VARCHAR(100) NOT NULL,
        "region_code" VARCHAR(10) NOT NULL DEFAULT 'ID',
        "latitude" DECIMAL(10,8) NOT NULL,
        "longitude" DECIMAL(11,8) NOT NULL,
        "title" TEXT NOT NULL,
        "meta" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "hero_image_url" TEXT,
        "best_time_label" VARCHAR(80) NOT NULL,
        "best_time_window" VARCHAR(80) NOT NULL,
        "popular_tags" TEXT,
        "area_keywords" TEXT,
        "display_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "created_at" BIGINT,
        "created_by" VARCHAR,
        "created_by_id" UUID,
        "updated_at" BIGINT,
        "updated_by" VARCHAR,
        "updated_by_id" UUID,
        "deleted_at" BIGINT,
        "deleted_by" VARCHAR,
        "deleted_by_id" UUID,
        CONSTRAINT "PK_hotspots_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_hotspots_slug" ON "hotspots"("slug")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_hotspots_active_order"
      ON "hotspots"("is_active", "display_order")
      WHERE "deleted_at" IS NULL
    `);

    const seededAt = Math.floor(Date.now() / 1000);
    const rows = HOTSPOT_SEED.map(
      (hotspot, index) => `(
        '${hotspot.slug}', '${esc(hotspot.name)}', 'Jawa Barat', 'ID',
        ${hotspot.lat}, ${hotspot.lng},
        '${esc(hotspot.title)}', '${esc(hotspot.meta)}', '${esc(hotspot.description)}',
        '${esc(hotspot.heroImageUrl)}', '${esc(hotspot.bestTimeLabel)}', '${esc(hotspot.bestTimeWindow)}',
        '${esc(hotspot.popularTags.join(','))}', '${esc(hotspot.areaKeywords.join(','))}',
        ${index}, ${hotspot.isDefault}, ${seededAt}, ${seededAt}
      )`,
    ).join(',\n');

    await queryRunner.query(`
      INSERT INTO "hotspots" (
        "slug", "name", "region", "region_code",
        "latitude", "longitude",
        "title", "meta", "description",
        "hero_image_url", "best_time_label", "best_time_window",
        "popular_tags", "area_keywords",
        "display_order", "is_default", "created_at", "updated_at"
      ) VALUES
      ${rows}
      ON CONFLICT ("slug") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_hotspots_active_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_hotspots_slug"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hotspots"`);
  }
}
