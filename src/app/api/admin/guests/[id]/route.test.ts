import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, selectMock, updateMock, deleteMock, setMock, whereMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  selectMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  setMock: vi.fn(),
  whereMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/admin", () => ({ isAdminEmail: () => true }));
vi.mock("@/db", () => ({
  groups: { id: "groups.id", maxPartySize: "groups.maxPartySize" },
  groupMembers: { groupId: "groupMembers.groupId" },
  rsvps: { groupId: "rsvps.groupId", partySize: "rsvps.partySize" },
  db: {
    select: selectMock,
    update: updateMock,
    delete: deleteMock,
  },
}));

import { PUT } from "@/app/api/admin/guests/[id]/route";

function selection(result: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(result) })),
    })),
  };
}

function countedSelection(memberCount: number) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([{ memberCount }]),
    })),
  };
}

describe("PUT /api/admin/guests/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { email: "admin@example.com" } });
    setMock.mockReturnValue({ where: whereMock });
    whereMock.mockResolvedValue(undefined);
    updateMock.mockReturnValue({ set: setMock });
  });

  it("updates only the group's max party size and preserves its RSVP", async () => {
    selectMock
      .mockReturnValueOnce(selection([{ id: 42 }]))
      .mockReturnValueOnce(selection([{ partySize: 4 }]))
      .mockReturnValueOnce(countedSelection(2));

    const response = await PUT(
      new Request("http://localhost/api/admin/guests/42", {
        method: "PUT",
        body: JSON.stringify({ maxPartySize: 5 }),
      }),
      { params: Promise.resolve({ id: "42" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, maxPartySize: 5 });
    expect(setMock).toHaveBeenCalledWith({ maxPartySize: 5 });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("rejects a limit below the existing RSVP headcount", async () => {
    selectMock
      .mockReturnValueOnce(selection([{ id: 42 }]))
      .mockReturnValueOnce(selection([{ partySize: 4 }]));

    const response = await PUT(
      new Request("http://localhost/api/admin/guests/42", {
        method: "PUT",
        body: JSON.stringify({ maxPartySize: 3 }),
      }),
      { params: Promise.resolve({ id: "42" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Max party size cannot be lower than the existing RSVP of 4.",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a limit below the connected-account count", async () => {
    selectMock
      .mockReturnValueOnce(selection([{ id: 42 }]))
      .mockReturnValueOnce(selection([{ partySize: 1 }]))
      .mockReturnValueOnce(countedSelection(2));

    const response = await PUT(
      new Request("http://localhost/api/admin/guests/42", {
        method: "PUT",
        body: JSON.stringify({ maxPartySize: 1 }),
      }),
      { params: Promise.resolve({ id: "42" }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Max party size cannot be lower than the 2 connected Google accounts.",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("allows a valid reduction after membership and RSVP counts are reduced", async () => {
    selectMock
      .mockReturnValueOnce(selection([{ id: 42 }]))
      .mockReturnValueOnce(selection([{ partySize: 1 }]))
      .mockReturnValueOnce(countedSelection(1));

    const response = await PUT(
      new Request("http://localhost/api/admin/guests/42", {
        method: "PUT",
        body: JSON.stringify({ maxPartySize: 1 }),
      }),
      { params: Promise.resolve({ id: "42" }) },
    );

    expect(response.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith({ maxPartySize: 1 });
  });
});
