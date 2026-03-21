document.addEventListener('DOMContentLoaded', () => {

    // STICKY HEADER
    const header = document.querySelector('.sticky-header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        if (currentScroll > lastScroll && currentScroll > 100) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        
        lastScroll = currentScroll;
    });

    // SMOOTH SCROLL FOR NAV LINKS
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // SCROLL ANIMATIONS (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-up').forEach(el => {
        observer.observe(el);
    });

    // PARALLAX EFFECT FOR HERO IMAGE/BG (if any)
    const heroBg = document.querySelector('.parallax-bg');
    
    // COLIZEUM-STYLE PARALLAX FOR HERO HEADING
    const heroHeading = document.getElementById('hero-parallax-heading');

    const galleryWrapper = document.getElementById('gallery');
    const galleryTrack = document.getElementById('gallery-track');

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY; // modern way
        
        if (heroBg) {
            heroBg.style.transform = `translateY(${scrolled * 0.4}px)`;
        }

        if (heroHeading) {
            // Fade out, move down, and slightly scale up/down based on scroll
            // Only calculate if within first 100vh to save performance
            if (scrolled < window.innerHeight) {
                const opacity = Math.max(0, 1 - (scrolled / 500));
                const translateY = scrolled * 0.6; // Moves down faster than the page scroll (parallax)
                const scale = 1 + (scrolled * 0.0005); // Slight growth
                
                heroHeading.style.transform = `translateY(${translateY}px) scale(${scale})`;
                heroHeading.style.opacity = opacity;
            }
        }

        // HORIZONTAL SCROLL GALLERY
        if (galleryWrapper && galleryTrack) {
            const wrapperRect = galleryWrapper.getBoundingClientRect();
            const maxScroll = wrapperRect.height - window.innerHeight;
            const currentScroll = -wrapperRect.top;
            
            // Apply animation if gallery is in the viewport range
            if (wrapperRect.top <= window.innerHeight && wrapperRect.bottom >= 0) {
                let progress = currentScroll / maxScroll;
                // Clamp progress between 0 and 1
                progress = Math.max(0, Math.min(progress, 1));
                
                // Track width - screen width is the amount it can be translated left
                const maxTranslate = galleryTrack.scrollWidth - window.innerWidth;
                
                if (maxTranslate > 0) {
                    galleryTrack.style.transform = `translateX(-${progress * maxTranslate}px)`;
                }
            }
        }
    });

});

// YANDEX MAP INITIALIZATION
ymaps.ready(init);

function init() {
    var myMap = new ymaps.Map("map", {
        center: [55.753215, 37.622504], // Center of Moscow
        zoom: 11,
        controls: ['zoomControl']
    });

    // Locations Array
    var locations = [
        { coords: [55.807794, 37.638531], name: "ГРОМ - Алексеевская" },
        { coords: [55.708811, 37.732789], name: "ГРОМ - Текстильщики" },
        { coords: [55.716616, 37.792823], name: "ГРОМ - Рязанский проспект" },
        { coords: [55.653537, 37.625522], name: "ГРОМ - Варшавская", link: "https://yandex.ru/maps/-/CPB8AD87" },
        { coords: [55.789234, 37.749557], name: "ГРОМ - Партизанская" },
        { coords: [55.805175, 37.514867], name: "ГРОМ - Сокол" }
    ];

    // Custom Neon Marker Icon
    locations.forEach(loc => {
        let balloonHtml = `<b>${loc.name}</b><br>Мужская парикмахерская. Стрижка за 30 минут.`;
        if (loc.link) {
            balloonHtml += `<br><br><a href="${loc.link}" target="_blank" style="color: #000; text-decoration: underline; font-weight: bold; font-size: 14px;">📍 Открыть в Яндекс.Картах</a>`;
        }
        
        var placemark = new ymaps.Placemark(loc.coords, {
            hintContent: loc.name,
            balloonContent: balloonHtml
        }, {
            preset: 'islands#blackCircleDotIcon',
            iconColor: '#C6FF00'
        });
        myMap.geoObjects.add(placemark);
    });
    
    // Disable scroll zoom
    myMap.behaviors.disable('scrollZoom');
}
