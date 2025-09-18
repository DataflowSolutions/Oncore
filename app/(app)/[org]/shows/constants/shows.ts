export interface Show {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  dateObject: Date;
}

export const SHOWS_DATA: Show[] = [
  {
    id: "1",
    title: "Summer Music Festival",
    description: "The Midnight Riders",
    location: "New York",
    date: "Jul 15",
    dateObject: new Date(2024, 6, 15), // July 15, 2024
  },
  {
    id: "2",
    title: "Rock Concert",
    description: "Electric Thunder",
    location: "Los Angeles",
    date: "Jul 22",
    dateObject: new Date(2024, 6, 22), // July 22, 2024
  },
  {
    id: "3",
    title: "Jazz Night",
    description: "Smooth Operators",
    location: "Chicago",
    date: "Aug 5",
    dateObject: new Date(2024, 7, 5), // August 5, 2024
  },
  {
    id: "4",
    title: "Folk Festival",
    description: "Acoustic Dreams",
    location: "Nashville",
    date: "Aug 12",
    dateObject: new Date(2024, 7, 12), // August 12, 2024
  },
  {
    id: "5",
    title: "Electronic Dance Night",
    description: "Neon Pulse",
    location: "Miami",
    date: "Aug 28",
    dateObject: new Date(2024, 7, 28), // August 28, 2024
  },
  {
    id: "6",
    title: "Country Music Show",
    description: "Hometown Heroes",
    location: "Austin",
    date: "Sep 3",
    dateObject: new Date(2024, 8, 3), // September 3, 2024
  },
  {
    id: "7",
    title: "Blues Brothers Tribute",
    description: "Soul Revival",
    location: "Memphis",
    date: "Sep 15",
    dateObject: new Date(2024, 8, 15), // September 15, 2024
  },
];

export const getShowsByMonth = (shows: Show[]) => {
  const groupedShows: { [key: string]: Show[] } = {};

  shows.forEach((show) => {
    const monthYear = show.dateObject.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    if (!groupedShows[monthYear]) {
      groupedShows[monthYear] = [];
    }

    groupedShows[monthYear].push(show);
  });

  // Sort shows within each month by date
  Object.keys(groupedShows).forEach((monthYear) => {
    groupedShows[monthYear].sort(
      (a, b) => a.dateObject.getTime() - b.dateObject.getTime()
    );
  });

  // Sort months chronologically
  const sortedEntries = Object.entries(groupedShows).sort(
    ([, showsA], [, showsB]) => {
      return showsA[0].dateObject.getTime() - showsB[0].dateObject.getTime();
    }
  );

  return Object.fromEntries(sortedEntries);
};
