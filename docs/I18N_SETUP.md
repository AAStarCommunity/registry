# i18n Setup Guide for Registry

## Installation

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

## File Structure

```
src/
├── i18n/
│   ├── config.ts          # i18n configuration
│   ├── locales/
│   │   ├── en.json        # English translations
│   │   └── zh.json        # Chinese translations
│   └── LanguageToggle.tsx # Language switcher component
```

## Usage in Components

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('welcome.title')}</h1>;
}
```

## Next Steps

1. Run: `npm install react-i18next i18next i18next-browser-languagedetector`
2. Create files as shown in this directory
3. Import i18n config in main.tsx
4. Wrap text with t() function
5. Add LanguageToggle to header

See example files in this folder for implementation details.
