/** @type {import('tailwindcss').Config} */
// 기존 프로토타입(CDN tailwind.config)의 커스텀 팔레트를 그대로 이식
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        violet: { 50: "#EEEBFA", 100: "#E7E2F8", 200: "#D7D2F2", 300: "#C2BAEC", 400: "#9A8FE6", 500: "#6E61DE", 600: "#5B4DD6", 700: "#4A3FB0", 800: "#3C3490", 900: "#2D2870" },
        emerald: { 50: "#E8F5F0", 100: "#D2ECE3", 200: "#A9DBCB", 300: "#7FC9B2", 400: "#54B596", 500: "#2E9E7B", 600: "#2E9E7B", 700: "#247E62", 800: "#1C6450", 900: "#154B3C" },
        red: { 50: "#FBEDED", 100: "#F6DCDC", 200: "#ECBEBE", 300: "#E29E9E", 400: "#DD8484", 500: "#D96A6A", 600: "#CF5A5A", 700: "#B84A4A", 800: "#963C3C", 900: "#7A3232" },
        amber: { 50: "#FBF3E4", 100: "#F6E7C8", 200: "#EFD49A", 300: "#E8C16C", 400: "#E1AD4B", 500: "#D99A36", 600: "#C6852A", 700: "#A66C20", 800: "#85561A", 900: "#6B4514" },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
