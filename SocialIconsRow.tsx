import React from 'react';
import { 
  Linkedin, 
  Instagram, 
  Twitter, 
  Facebook, 
  MessageCircle, 
  Mail 
} from 'lucide-react';
import { getSocialUrls } from '../../utils/socialHelpers';

interface SocialIconsRowProps {
  socials?: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    tiktok?: string;
    facebook?: string;
  };
  instagramOrTwitter?: string;
  whatsappNumber?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SocialIconsRow: React.FC<SocialIconsRowProps> = ({
  socials,
  instagramOrTwitter,
  whatsappNumber,
  email,
  size = 'md',
  className = '',
}) => {
  const { linkedinUrl, instagramUrl, twitterUrl, facebookUrl, whatsappUrl } = getSocialUrls(
    socials,
    instagramOrTwitter,
    whatsappNumber
  );

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  const buttonPaddings = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const hasAnySocial = Boolean(
    linkedinUrl || instagramUrl || twitterUrl || facebookUrl || whatsappUrl || email
  );

  if (!hasAnySocial) return null;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* LinkedIn */}
      {linkedinUrl && (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className={`${buttonPaddings[size]} rounded-full bg-white/5 hover:bg-[#0077b5]/20 hover:text-[#0077b5] text-zinc-300 border border-white/10 hover:border-[#0077b5]/40 transition-all cursor-pointer`}
          title="LinkedIn Profile"
          aria-label="LinkedIn Profile"
          onClick={(e) => e.stopPropagation()}
        >
          <Linkedin className={iconSizes[size]} />
        </a>
      )}

      {/* Instagram */}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          className={`${buttonPaddings[size]} rounded-full bg-white/5 hover:bg-[#E1306C]/20 hover:text-[#E1306C] text-zinc-300 border border-white/10 hover:border-[#E1306C]/40 transition-all cursor-pointer`}
          title="Instagram Profile"
          aria-label="Instagram Profile"
          onClick={(e) => e.stopPropagation()}
        >
          <Instagram className={iconSizes[size]} />
        </a>
      )}

      {/* X / Twitter */}
      {twitterUrl && (
        <a
          href={twitterUrl}
          target="_blank"
          rel="noreferrer"
          className={`${buttonPaddings[size]} rounded-full bg-white/5 hover:bg-white/20 hover:text-white text-zinc-300 border border-white/10 hover:border-white/30 transition-all cursor-pointer`}
          title="X Profile"
          aria-label="X Profile"
          onClick={(e) => e.stopPropagation()}
        >
          <Twitter className={iconSizes[size]} />
        </a>
      )}

      {/* Facebook */}
      {facebookUrl && (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noreferrer"
          className={`${buttonPaddings[size]} rounded-full bg-white/5 hover:bg-[#1877F2]/20 hover:text-[#1877F2] text-zinc-300 border border-white/10 hover:border-[#1877F2]/40 transition-all cursor-pointer`}
          title="Facebook Profile"
          aria-label="Facebook Profile"
          onClick={(e) => e.stopPropagation()}
        >
          <Facebook className={iconSizes[size]} />
        </a>
      )}

      {/* WhatsApp */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className={`${buttonPaddings[size]} rounded-full bg-white/5 hover:bg-[#25D366]/20 hover:text-[#25D366] text-zinc-300 border border-white/10 hover:border-[#25D366]/40 transition-all cursor-pointer`}
          title="Chat on WhatsApp"
          aria-label="Chat on WhatsApp"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle className={iconSizes[size]} />
        </a>
      )}

      {/* Email */}
      {email && (
        <a
          href={`mailto:${email}`}
          className={`${buttonPaddings[size]} rounded-full bg-white/5 hover:bg-amber-400/20 hover:text-amber-300 text-zinc-300 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer`}
          title={`Email: ${email}`}
          aria-label={`Email ${email}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Mail className={iconSizes[size]} />
        </a>
      )}
    </div>
  );
};
