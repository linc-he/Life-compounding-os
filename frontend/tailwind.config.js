/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // minimal-cards 设计语言（来自 user 上传的 skill 指导）
        stage: "#ECECEB",      // 浅灰舞台背景
        card: "#FFFFFF",       // 白卡片
        hairline: "#EBEBEE",   // 未点亮点 / 发丝分隔
        muted: "#8A8A8E",      // 灰色小标签
        accent: "#FF6600",     // 单一强调色（可整体替换）
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // 卡片柔和长影：hairline ring + 长影
        widget: "0 0 0 1px rgba(0,0,0,0.045), 0 14px 34px -16px rgba(0,0,0,0.16)",
      },
      borderRadius: {
        widget: "22px",
      },
    },
  },
  plugins: [],
};
