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
        lightGreen: "#b9d4c0ff",
        ultraLightGreen: "#d5e5d9ff" ,

        accentYellow: "#E48C2A",   // Gelb aus Logo
        lightYellow: "#fbe6cf",

        accentRed: "#e73501",      // Rot aus Logo
        lightRed: "#f8d6ccff",
      
        bgSoft: "#F4F7F5",
      },
    },
  },
  plugins: [],
}
