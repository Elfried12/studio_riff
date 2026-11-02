export interface CreateBookingBody {
  memberId: string;
  start: string;
  end: string;
}

export const createBookingSchema = {
  body: {
    type: "object",
    required: ["memberId", "start", "end"],
    properties: {
      memberId: { type: "string", minLength: 1 },
      start: { type: "string", minLength: 1 },
      end: { type: "string", minLength: 1 },
    },
  },
} as const;
