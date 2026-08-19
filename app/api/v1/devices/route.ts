import type { NextRequest } from "next/server";
import { registerDeviceSchema } from "@/schemas/device.schema";
import { deviceService } from "@/services";
import { requireUser } from "@/http/guards";
import { created, ok, withErrorHandling } from "@/http/response";

/** GET /v1/devices — the caller's own registered devices. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const devices = await deviceService.listOwnDevices(userId);
  return ok(devices);
});

/** POST /v1/devices — register or refresh this device's public identity key. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { userId } = await requireUser(request);
  const body = await request.json();
  const dto = registerDeviceSchema.parse(body);
  const device = await deviceService.registerDevice(userId, dto);
  return created(device);
});
