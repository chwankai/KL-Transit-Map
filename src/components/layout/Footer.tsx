import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="py-4 text-center text-[11px] text-text-secondary border-t border-white/5 mt-auto select-none w-full">
      © 2026 Chwan Kai. All Rights Reserved.{" "}
      <a
        href="https://github.com/chwankai/KL-Transit-Map"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-400 hover:underline font-semibold ml-1"
      >
        Github
      </a>
    </footer>
  );
};
