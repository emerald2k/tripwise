import { z } from 'zod'

export const transportModeSchema = z.enum([
  'walk',
  'metro',
  'bus',
  'train',
  'tram',
  'taxi',
  'car',
  'flight',
])

export const locationCategorySchema = z.enum([
  'attraction',
  'restaurant',
  'hotel',
  'nightlife',
  'activity',
  'airport',
  'station',
  'other',
])

const strict = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict()

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const journeySchema = strict({
  departureDate: dateSchema,
  destinationArrivalDate: dateSchema,
})

export const coordinatesSchema = strict({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const locationSchema = strict({
  locationId: z.string().min(1),
  name: z.string().min(1),
  category: locationCategorySchema,
  address: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  coordinates: coordinatesSchema.optional(),
  googleMapsUrl: z.string().url().optional(),
})

export const transportSchema = strict({
  mode: transportModeSchema,
  distanceMeters: z.number().int().nonnegative().optional(),
  durationMinutes: z.number().int().positive().optional(),
})

export const locationItemSchema = strict({
  itemId: z.string().min(1),
  startTime: timeSchema,
  title: z.string().min(1),
  locationId: z.string().min(1),
  durationMinutes: z.number().int().positive().optional(),
  progress: z.literal(true).optional(),
})

export const transportItemSchema = strict({
  itemId: z.string().min(1),
  startTime: timeSchema,
  title: z.string().min(1),
  transport: transportSchema,
})

export const itemSchema = z.union([locationItemSchema, transportItemSchema])

export const daySchema = strict({
  date: dateSchema,
  title: z.string().min(1).optional(),
  items: z.array(itemSchema).min(1),
})

export const itinerarySchema = strict({
  id: z.string().min(1),
  name: z.string().min(1),
  journey: journeySchema,
  days: z.array(daySchema).min(1),
})

export const citySchema = strict({
  cityId: z.string().min(1),
  name: z.string().min(1),
  locations: z.array(locationSchema).min(1),
})

export const manifestItinerarySchema = strict({
  id: z.string().min(1),
  file: z.string().min(1),
  name: z.string().min(1),
})

export const manifestSchema = strict({
  itineraries: z.array(manifestItinerarySchema),
  cities: z.array(z.string().min(1)),
})

export type Itinerary = z.infer<typeof itinerarySchema>
export type Journey = z.infer<typeof journeySchema>
export type Day = z.infer<typeof daySchema>
export type Item = z.infer<typeof itemSchema>
export type LocationItem = z.infer<typeof locationItemSchema>
export type TransportItem = z.infer<typeof transportItemSchema>
export type Location = z.infer<typeof locationSchema>
export type City = z.infer<typeof citySchema>
export type Manifest = z.infer<typeof manifestSchema>
