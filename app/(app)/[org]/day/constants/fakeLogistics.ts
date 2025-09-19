export const logistics = {
  hotel: {
    name: "The Plaza Hotel",
    checkIn: "Jul 15 15:00",
    checkOut: "Jul 16 11:00",
  },
  flights: [
    {
      label: "Arrival",
      code: "AA1234",
      from: "JFK",
      to: "LAX",
      depart: "08:30",
      arrive: "11:45",
    },
    {
      label: "Return",
      code: "AA5678",
      from: "LAX",
      to: "JFK",
      depart: "14:30",
      arrive: "23:15",
    },
  ],
  transportation: [
    { time: "14:00", from: "Airport", to: "Hotel" },
    { time: "16:00", from: "Hotel", to: "Restaurant" },
    { time: "17:00", from: "Restaurant", to: "Venue" },
    { time: "18:00", from: "Venue", to: "Hotel" },
  ],
  catering: {
    company: "Elite Catering Co.",
    serviceTime: "17:30",
  },
};
