export const FILMS = [
    {
        title: "Eternal Sunshine of the Spotless Mind",
        spine: "Eternal Sunshine",
        year: 2004,
        slug: "eternal-sunshine-of-the-spotless-mind",
        poster: "/films/eternal-sunshine.jpg",
    },
    {
        title: "Donnie Darko",
        spine: "Donnie Darko",
        year: 2001,
        slug: "donnie-darko",
        poster: "/films/donnie-darko.jpg",
    },
    {
        title: "Scott Pilgrim vs. the World",
        spine: "Scott Pilgrim",
        year: 2010,
        slug: "scott-pilgrim-vs-the-world",
        poster: "/films/scott-pilgrim.jpg",
    },
    {
        title: "Bridge to Terabithia",
        spine: "Terabithia",
        year: 2007,
        slug: "bridge-to-terabithia",
        poster: "/films/bridge-to-terabithia.jpg",
    },
];

export type Film = (typeof FILMS)[number];
