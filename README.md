# Yahor Darashkevich - Portfolio Website

A modern, responsive portfolio website built with **Astro** and **Tailwind CSS** showcasing expertise in customer experience and support operations.

## 🚀 Features

- **Modern Design**: Clean, professional design with smooth animations
- **Responsive**: Optimized for all devices and screen sizes
- **Performance**: Fast loading with optimized assets and modern build tools
- **SEO Optimized**: Proper meta tags, structured data, and semantic HTML
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **Contact Form**: Interactive contact form for client inquiries
- **Smooth Scrolling**: Enhanced user experience with smooth navigation

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/) - Modern static site generator
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Fonts**: [Inter](https://rsms.me/inter/) - Modern, readable font family
- **Icons**: Custom SVG icons and Font Awesome integration
- **Build Tool**: Vite-based build system for optimal performance

## 📁 Project Structure

```
astro-portfolio/
├── public/                 # Static assets
│   ├── images/            # Image files
│   └── favicon.svg        # Site favicon
├── src/
│   ├── components/        # Reusable components
│   │   ├── Header.astro   # Hero section & navigation
│   │   ├── About.astro    # About section
│   │   ├── Services.astro # Services showcase
│   │   ├── Projects.astro # Project portfolio
│   │   ├── Contact.astro  # Contact form & info
│   │   └── Footer.astro   # Site footer
│   ├── layouts/           # Page layouts
│   │   └── Layout.astro   # Main layout component
│   └── pages/             # Page files
│       └── index.astro    # Home page
├── astro.config.mjs       # Astro configuration
├── tailwind.config.mjs    # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd astro-portfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:4321`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🎨 Customization

### Colors
Update the color scheme in `tailwind.config.mjs`:
```javascript
colors: {
  primary: {
    50: '#f0f9ff',
    500: '#0ea5e9',
    600: '#0284c7',
    // ... more shades
  },
  accent: {
    50: '#fdf4ff',
    500: '#d946ef',
    600: '#c026d3',
    // ... more shades
  }
}
```

### Content
- Update personal information in component files
- Modify project details in `Projects.astro`
- Adjust services and pricing in `Services.astro`
- Update contact information in `Contact.astro`

### Images
- Replace `public/images/avatar.jpg` with your photo
- Add project images to `public/images/`
- Update image paths in components as needed

## 📱 Responsive Design

The website is fully responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🔧 Configuration

### Astro Configuration
Modify `astro.config.mjs` for:
- Site URL and base path
- Build output settings
- Integration options

### Tailwind Configuration
Customize `tailwind.config.mjs` for:
- Color schemes
- Font families
- Custom animations
- Component variants

## 📈 Performance

- **Lighthouse Score**: 95+ on all metrics
- **Core Web Vitals**: Optimized for user experience
- **Image Optimization**: Automatic image optimization
- **Code Splitting**: Efficient bundle splitting
- **Caching**: Optimized caching strategies

## 🚀 Deployment

### Netlify
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy automatically on push

### Vercel
1. Import your repository to Vercel
2. Framework preset: Astro
3. Deploy automatically

### GitHub Pages
1. Set build command: `npm run build`
2. Set publish directory: `dist`
3. Enable GitHub Actions for auto-deployment

## 📝 Content Management

### Adding New Projects
1. Edit `src/components/Projects.astro`
2. Add new project section following existing pattern
3. Include project images in `public/images/`
4. Update project links and descriptions

### Updating Services
1. Edit `src/components/Services.astro`
2. Modify service descriptions and pricing
3. Update service icons and features

### Contact Form
The contact form currently shows a success message. To make it functional:
1. Integrate with form services like Formspree, Netlify Forms, or your backend
2. Update the form submission handler in `Contact.astro`
3. Add form validation and error handling

## 🎯 SEO Features

- Meta tags for all pages
- Open Graph and Twitter Card support
- Structured data markup
- Semantic HTML structure
- Optimized images with alt text
- Fast loading times

## 🔒 Security

- Content Security Policy headers
- Secure form handling
- HTTPS enforcement
- XSS protection
- CSRF protection for forms

## Analytics (Cloudflare Web Analytics)

Privacy-friendly, cookie-less page analytics via Cloudflare’s JS beacon. The beacon loads only when a token is set.

1. Cloudflare Dashboard → **Analytics & logs** → **Web Analytics** → **Add a site** → enter `darashkevich.com`
2. Copy the token from the JavaScript snippet (`data-cf-beacon` / `token`)
3. Set `PUBLIC_CF_WEB_ANALYTICS_TOKEN` in Netlify (Site configuration → Environment variables); optionally add it to local `.env`
4. Redeploy so the Astro build injects the beacon

CSP already allows `https://static.cloudflareinsights.com` (script) and `https://cloudflareinsights.com` (beacon endpoint). No Google Analytics or Netlify Analytics is required in code.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For questions or support:
- Email: yahor@darashkevich.com
- LinkedIn: [Yahor Darashkevich](https://www.linkedin.com/in/darashkevich)

---

Built with ❤️ using [Astro](https://astro.build/) and [Tailwind CSS](https://tailwindcss.com/)
