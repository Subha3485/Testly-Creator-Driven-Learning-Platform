import { bookings, routes, users } from "../data/store.js";

const BOOKING_STATUSES = ["Booked", "Loaded", "In Transit", "Reached", "Delivered"];

export function sanitizeRoute(route) {
  return {
    id: route.id,
    name: route.name,
    code: route.code,
    baseFare: route.baseFare,
    perKmFare: route.perKmFare,
    stops: route.stops,
    slots: route.slots
  };
}

export function getRouteById(routeId) {
  return routes.find((route) => route.id === routeId);
}

export function getUserById(userId) {
  return users.find((user) => user.id === userId);
}

export function validateStopSequence(route, pickupStopId, dropStopId) {
  const pickupIndex = route.stops.findIndex((stop) => stop.id === pickupStopId);
  const dropIndex = route.stops.findIndex((stop) => stop.id === dropStopId);

  if (pickupIndex === -1 || dropIndex === -1) {
    throw createBadRequest("Pickup or drop stop does not exist on this route.");
  }

  if (dropIndex <= pickupIndex) {
    throw createBadRequest("Drop stop must come after pickup stop in the route sequence.");
  }

  return {
    pickupIndex,
    dropIndex,
    pickupStop: route.stops[pickupIndex],
    dropStop: route.stops[dropIndex]
  };
}

export function calculateFare({
  route,
  pickupStopId,
  dropStopId,
  weightKg,
  quantity,
  fragile,
  express
}) {
  const { pickupStop, dropStop } = validateStopSequence(route, pickupStopId, dropStopId);
  const distanceKm = dropStop.kmFromStart - pickupStop.kmFromStart;
  const distanceFare = route.baseFare + distanceKm * route.perKmFare;
  const weightCharge = Number(weightKg) * 8;
  const quantityCharge = (Number(quantity) - 1) * 24;
  const fragileCharge = fragile ? 40 : 0;
  const expressCharge = express ? 75 : 0;
  const total = Math.round(distanceFare + weightCharge + quantityCharge + fragileCharge + expressCharge);

  return {
    routeId: route.id,
    pickupStop,
    dropStop,
    distanceKm,
    breakdown: {
      baseFare: route.baseFare,
      distanceFare: Math.round(distanceKm * route.perKmFare),
      weightCharge,
      quantityCharge,
      fragileCharge,
      expressCharge
    },
    totalFare: total
  };
}

export function createBooking({
  userId,
  routeId,
  pickupStopId,
  dropStopId,
  slotId,
  packageType,
  weightKg,
  quantity,
  fragile,
  express,
  paymentMethod
}) {
  const user = getUserById(userId);
  if (!user) {
    throw createBadRequest("User does not exist.");
  }

  const route = getRouteById(routeId);
  if (!route) {
    throw createBadRequest("Route does not exist.");
  }

  const slot = route.slots.find((item) => item.id === slotId);
  if (!slot) {
    throw createBadRequest("Selected slot does not exist for this route.");
  }

  const quote = calculateFare({
    route,
    pickupStopId,
    dropStopId,
    weightKg,
    quantity,
    fragile,
    express
  });

  const booking = {
    id: `BK-${String(bookings.length + 240302).padStart(6, "0")}`,
    userId,
    routeId,
    pickupStopId,
    dropStopId,
    slotId,
    packageType,
    weightKg: Number(weightKg),
    quantity: Number(quantity),
    fragile: Boolean(fragile),
    express: Boolean(express),
    fare: quote.totalFare,
    paymentMethod,
    status: "Booked",
    createdAt: new Date().toISOString(),
    tracking: [{ status: "Booked", time: new Date().toISOString() }]
  };

  bookings.unshift(booking);

  return serializeBooking(booking);
}

export function serializeBooking(booking) {
  const route = getRouteById(booking.routeId);
  const slot = route?.slots.find((item) => item.id === booking.slotId);
  const pickup = route?.stops.find((stop) => stop.id === booking.pickupStopId);
  const drop = route?.stops.find((stop) => stop.id === booking.dropStopId);

  return {
    ...booking,
    route: route ? { id: route.id, name: route.name, code: route.code } : null,
    slot,
    pickupStop: pickup,
    dropStop: drop,
    statusFlow: BOOKING_STATUSES
  };
}

export function getBookingsForUser(userId) {
  return bookings.filter((booking) => booking.userId === userId).map(serializeBooking);
}

export function getBookingById(bookingId) {
  const booking = bookings.find((item) => item.id === bookingId);
  return booking ? serializeBooking(booking) : null;
}

export function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
