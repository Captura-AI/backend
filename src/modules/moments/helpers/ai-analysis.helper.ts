// Entities
import type { MomentEntity } from '../entities/moments.entity';

// Enums
import { VehicleTypeEnum } from '../enums/vehicle-type.enum';

// Interfaces
import type { IAiAnalysisResponse, MomentScalarUpdate } from '../interfaces/moments.interface';

export const VEHICLE_TYPE_MAP: Record<string, VehicleTypeEnum> = {
  BICYCLE: VehicleTypeEnum.BICYCLE,
  BUS: VehicleTypeEnum.BUS,
  CAR: VehicleTypeEnum.CAR,
  MOTORCYCLE: VehicleTypeEnum.MOTORCYCLE,
  TRUCK: VehicleTypeEnum.TRUCK,
};

export function buildAutoFillFields(
  moment: MomentEntity,
  data: IAiAnalysisResponse,
): MomentScalarUpdate {
  const fields: MomentScalarUpdate = {};

  // Only fill a column the photographer left empty, and only with a real value
  // (empty string / null are treated as "no value"). Kept as one helper so the
  // per-field rules stay flat and cognitive complexity low.
  const fill = <K extends keyof MomentScalarUpdate>(
    key: K,
    current: string | number | null | undefined,
    next: MomentScalarUpdate[K] | null | undefined,
  ): void => {
    const isEmpty = current == null || current === '';
    if (isEmpty && next != null && next !== '') {
      // `key` is a compile-time `keyof MomentScalarUpdate` literal, not user input —
      // safe despite the generic object-injection rule.
      // eslint-disable-next-line security/detect-object-injection
      fields[key] = next as MomentScalarUpdate[K];
    }
  };

  let vehicleType: VehicleTypeEnum | null = null;
  if (data.vehicle_type) {
    vehicleType = VEHICLE_TYPE_MAP[data.vehicle_type] ?? VehicleTypeEnum.OTHER;
  }

  let cameraInfo: string | null = null;
  if (data.exif?.camera_model) {
    const make = data.exif.camera_make ? `${data.exif.camera_make} ` : '';
    cameraInfo = `${make}${data.exif.camera_model}`.trim();
  }

  fill('vehicleType', moment.vehicleType, vehicleType);
  fill('licensePlate', moment.licensePlate, data.license_plate);
  fill('motorType', moment.motorType, data.motor_type);
  fill('color', moment.color, data.color);
  fill('latitude', moment.latitude, data.exif?.latitude);
  fill('longitude', moment.longitude, data.exif?.longitude);
  fill('capturedAt', moment.capturedAt, data.exif?.captured_at);
  fill('cameraInfo', moment.cameraInfo, cameraInfo);

  return fields;
}
