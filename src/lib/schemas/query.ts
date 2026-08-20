import { z } from "zod";

/** The "Destination" field is restricted to this single value — see new-query-form.tsx. Keep in sync with that dropdown. */
export const VIETNAM_DESTINATIONS = ["Vietnam"] as const;

export const createQuerySchema = z.object({
  querySource: z.string().min(1, "Query source is required").max(80),
  contactPerson: z.string().min(1, "Contact person is required").max(120),
  referenceId: z.string().max(60).optional(),
  tags: z.array(z.string()),

  destination: z.enum(VIETNAM_DESTINATIONS, { message: "Select a destination" }),
  travelDate: z.string().min(1, "A valid travel date is required"),
  numberOfNights: z.number().int().min(1, "Must be at least 1 night"),
  adults: z.number().int().min(1, "At least 1 adult is required"),
  children: z.number().int().min(0),

  guestName: z.string().max(120).optional(),
  guestEmail: z
    .string()
    .max(200)
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  phoneNumber: z
    .string()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Phone number can only contain digits")
    .optional()
    .or(z.literal("")),

  specialNotes: z.string().max(2000).optional(),
});

export type CreateQueryInput = z.infer<typeof createQuerySchema>;
