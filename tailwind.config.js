// tailwind.config.js
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

// index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

// netlify.toml
[build]
  command = "npm install && npm run build"
  publish = "build"
