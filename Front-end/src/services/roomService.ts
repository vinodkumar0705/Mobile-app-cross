import { apiRequest } from "../lib/apiClient";
import { Room } from "../types/hms";
import { INITIAL_ROOMS } from "../lib/mockData";

export const roomService = {
  async getRooms(): Promise<{ success: boolean; data: Room[]; isLiveBackend: boolean }> {
    const res = await apiRequest("/organization/room");
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const mapped: Room[] = res.data.map((item: any, idx: number) => ({
        id: item.id || `ROOM-${300 + idx}`,
        number: item.roomNumber || item.number || `${300 + idx}`,
        type: item.type || "Semi-Private",
        floor: item.floor || "Floor 3",
        wing: item.wing || "East Wing",
        ratePerDay: item.ratePerDay || item.rate || 250,
        totalBeds: item.totalBeds || 2,
        occupiedBeds: item.occupiedBeds || 1,
        amenities: Array.isArray(item.amenities) ? item.amenities : ["Oxygen Outlet", "Adjustable Bed"],
      }));
      return { success: true, data: mapped, isLiveBackend: true };
    }

    return { success: true, data: INITIAL_ROOMS, isLiveBackend: false };
  },

  async createRoom(roomData: Partial<Room>): Promise<{ success: boolean; data?: Room; error?: string }> {
    const res = await apiRequest("/organization/room", {
      method: "POST",
      body: JSON.stringify(roomData),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to create room" };
  },

  async blockUnblockRoom(roomId: string, isBlocked: boolean): Promise<{ success: boolean; error?: string }> {
    const res = await apiRequest("/room/blockUnblockRoom", {
      method: "PATCH",
      body: JSON.stringify({ roomId, isBlocked }),
    });

    if (res.success) {
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to update room status" };
  },
};
