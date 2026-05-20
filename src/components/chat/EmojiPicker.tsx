import React from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😶‍🌫️', '😐', '😑', '😬', '🫨', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🫥', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕']
  },
  {
    name: 'Gestos/Corpo',
    icon: '👍',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫵', '🤘', '🤟', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🫱', '🫲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸']
  },
  {
    name: 'Corações/Emoticons',
    icon: '❤️',
    emojis: ['❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🖤', '🩶', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '🔮', '🧿', '⭐', '🌟', '✨', '⚡', '🔥', '💥', '☄️', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '💨', '🌪️', '🌫️', '🌬️', '🌈', '☂️', '☔', '⚡', '💧', '💦', '🫧']
  },
  {
    name: 'Tecnologia/MDR',
    icon: '📱',
    emojis: ['💻', '🖥️', '💻', '🔌', '🔋', '📱', '📲', '☎️', '📞', '📠', '💾', '💿', '📀', '⌨️', '🖱️', ' trackball', '🖥️', '🖨️', '🎬', '📺', '📷', '📸', '📹', '🎥', '🎞️', '🎙️', '🎚️', '🎛️', '🎧', '📻', '📢', '📣', '📯', '🔔', '🔕', '🎼', '🎵', '🎶', '🎤', '⚙️', '🛠️', '🔧', '🔨', '⛏️', '🔩', '🧱', '⛓️', '🧲', '🔫', '💣', '🛡️', '🔑', '🗝️', '🛍️', '🛒']
  }
];

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = React.useState(0);

  return (
    <div className="absolute bottom-20 left-4 z-50 w-72 h-80 rounded-[28px] border border-white/10 bg-surface-container-high/90 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Category Tabs */}
      <div className="flex border-b border-white/5 bg-white/5 p-2 gap-1 overflow-x-auto custom-scrollbar">
        {EMOJI_CATEGORIES.map((cat, index) => (
          <button
            key={cat.name}
            type="button"
            onClick={() => setActiveCategory(index)}
            title={cat.name}
            className={`p-2 text-base rounded-lg transition-all ${
              activeCategory === index 
                ? 'bg-white/10 text-white scale-105' 
                : 'opacity-40 hover:opacity-100 hover:bg-white/5'
            }`}
          >
            {cat.icon}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-2 text-xs font-black uppercase tracking-wider text-error/80 hover:text-error hover:bg-error/10 rounded-lg transition-all"
        >
          Fechar
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">
          {EMOJI_CATEGORIES[activeCategory].name}
        </div>
        <div className="grid grid-cols-6 gap-2 text-center">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className="text-2xl p-1 hover:bg-white/10 rounded-xl transition-all hover:scale-125 duration-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
