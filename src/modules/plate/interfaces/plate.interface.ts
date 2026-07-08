export interface IAiMotorDetection {
  motor_type: string;
  motor_type_confidence: number;
  color: string | null;
  color_confidence: number | null;
  plate: string | null;
  plate_confidence: number | null;
  bbox: number[];
}

export interface IAiPlateScanResult {
  uploader_id: string;
  plates: string[];
  confidence: number | null;
  motors: IAiMotorDetection[];
  saved_photo: string | null;
  saved_result_photo: string | null;
  error: string | null;
}

export interface IAiPlateConfirmResult {
  uploader_id: string;
  action: string;
  success: boolean;
  message: string;
}

export interface IAiPlateExtractResult {
  plates: string[];
  confidence: number | null;
  motors: IAiMotorDetection[];
  error: string | null;
}

export interface IPlateExtractMotor {
  motorType: string;
  motorTypeConfidence: number;
  color: string | null;
  colorConfidence: number | null;
}

export interface IPlateExtractResult {
  plates: string[];
  confidence: number | null;
  motors: IPlateExtractMotor[];
  error: string | null;
}
