/// <reference types="vite/client" />

declare module "open-location-code" {
  class OpenLocationCode {
    encode(latitude: number, longitude: number, codeLength?: number): string;
    decode(code: string): { latitudeCenter: number; longitudeCenter: number; codeLength: number };
    isValid(code: string): boolean;
    isFull(code: string): boolean;
  }
  export { OpenLocationCode };
}
