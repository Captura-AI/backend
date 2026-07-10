// Entities
import type { MomentEntity } from '../entities/moments.entity';
import type { UsersEntity } from '../../users/entities/users.entity';

// Helpers
import { maskPlate } from '../../../common/helpers/plate.helper';

// Interfaces
import type { IAiAnalysisVehicle, IPublicPhotographer } from '../interfaces/moments.interface';

// The raw ai-service payload carries a raw plate read in two places: a
// top-level `license_plate` (the unmatched-plate fallback — see analyzer.py)
// and a per-vehicle `license_plate` inside `vehicles[]`. It also embeds a
// 512-dim `embedding`. All three must be stripped/masked before reaching a
// public response, mirroring the masking already applied to moments.licensePlate.
export function sanitizeAiAnalysis(
  aiAnalysis: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!aiAnalysis) {
    return aiAnalysis;
  }

  const publicFields = { ...aiAnalysis };
  delete publicFields['embedding'];

  if (typeof publicFields['license_plate'] === 'string') {
    publicFields['license_plate'] = maskPlate(publicFields['license_plate']);
  }

  const vehicles = publicFields['vehicles'];

  if (!Array.isArray(vehicles)) {
    return publicFields;
  }

  return {
    ...publicFields,
    vehicles: vehicles.map((vehicle) => {
      const typedVehicle = vehicle as IAiAnalysisVehicle;

      return { ...typedVehicle, license_plate: maskPlate(typedVehicle.license_plate ?? null) };
    }),
  };
}

// Public moment responses must never carry a photographer's email, phone,
// or OAuth identifiers — only the identity fields the UI actually renders.
export function sanitizePhotographer(
  user: UsersEntity | null | undefined,
): IPublicPhotographer | null {
  if (!user) {
    return null;
  }

  return { id: user.id, name: user.name, avatar: user.avatar, role: user.role };
}

export function maskPublicMoment(moment: MomentEntity): MomentEntity {
  const masked = Object.assign(
    Object.create(Object.getPrototypeOf(moment)) as MomentEntity,
    moment,
    {
      licensePlate: maskPlate(moment.licensePlate),
      aiAnalysis: sanitizeAiAnalysis(moment.aiAnalysis),
      embeddingVector: null,
    },
  );

  if (moment.photographer) {
    masked.photographer = sanitizePhotographer(moment.photographer) as unknown as UsersEntity;
  }

  if (moment.photographerProfile?.user) {
    masked.photographerProfile = Object.assign(
      Object.create(Object.getPrototypeOf(moment.photographerProfile)),
      moment.photographerProfile,
      { user: sanitizePhotographer(moment.photographerProfile.user) },
    );
  }

  return masked;
}
