import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src="/images/CNE-logo.png"
            alt="Logo"
            style={{ objectFit: 'contain' }}
        />
    );
}
