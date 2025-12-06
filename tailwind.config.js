export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#317153",        // Hauptgrün
        primaryDark: "#336A4A",
        primaryLight: "#EAF4EE",

        accentYellow: "#E48C2A",   // Gelb aus Logo
        accentRed: "#D9534F",      // Rot aus Logo

        bgSoft: "#F4F7F5",
      },
    },
  },
  plugins: [],
}
