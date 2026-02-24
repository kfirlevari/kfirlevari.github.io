# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website for Kfir Lev-Ari, hosted on GitHub Pages at kfirlevari.github.io. It's a static single-page site built on the MyResume Bootstrap template.

## Architecture

- **Single HTML file**: `index.html` contains all page content and structure
- **Custom styling**: `assets/css/style.css` - main stylesheet for the template
- **Custom JavaScript**: `assets/js/main.js` - handles interactivity (navigation, scroll effects, portfolio filtering, typed.js animation)

### Vendor Libraries (in assets/vendor/)
- Bootstrap 5.3.1 - CSS framework
- AOS - Scroll animations
- Typed.js - Typewriter effect in hero section
- Isotope - Portfolio/photography grid filtering
- GLightbox - Image lightbox
- Swiper - Carousel/slider
- PureCounter - Animated counters
- Waypoints - Scroll position triggers

### Icon Libraries
- Bootstrap Icons
- Boxicons
- Font Awesome
- Academicons (for academic icons like Google Scholar, DBLP)

## Development

No build process required - this is a static site. To develop:

1. Edit `index.html` directly for content changes
2. Edit `assets/css/style.css` for styling changes
3. Edit `assets/js/main.js` for behavior changes
4. Open `index.html` in a browser to preview, or use any local server

## Deployment

Push to the `main` branch - GitHub Pages automatically serves the site.

## Key Sections in index.html

- Hero section with typed.js animation (lines 68-84)
- About section (lines 88-123)
- Facts/stats with PureCounter (lines 125-179)
- Publications section with icon boxes (lines 181-309)
- Photography portfolio with Isotope filtering (lines 314-1203)
- Links/resources section (lines 1207-1283)
