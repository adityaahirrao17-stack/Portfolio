// Portfolio JavaScript
// Liquid Glass effect is handled via CSS backdrop-filter with SVG filter

// Intro greeting animation
(function() {
  const introLoader = document.getElementById('introLoader');
  const introWord = document.getElementById('introLoaderWord');
  const greetings = ['Hello', 'Namaste', 'Bonjour', 'Hola', 'Konnichiwa', 'Ciao'];

  if (!introLoader || !introWord) return;

  // Pace: ~2.6s total. The old 5s hold read as "the page is broken".
  const STEP = 430;
  const HOLD = greetings.length * STEP;

  document.body.classList.add('intro-lock');

  const timers = [];
  let finished = false;

  greetings.forEach((greeting, index) => {
    timers.push(setTimeout(() => {
      introWord.classList.remove('is-switching');
      introWord.textContent = greeting;
      void introWord.offsetWidth;
      introWord.classList.add('is-switching');
    }, index * STEP));
  });

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    introLoader.classList.add('is-hidden');
    document.body.classList.remove('intro-lock');
    setTimeout(() => introLoader.remove(), 800);
  }

  timers.push(setTimeout(finish, HOLD));

  // Any intent to interact skips the rest of the greeting
  ['click', 'keydown', 'wheel', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, finish, { once: true, passive: true });
  });
})();

// Initialize EmailJS (only present on pages that load the SDK)
(function() {
  if (typeof emailjs === 'undefined') return;
  emailjs.init("tNoh2RcQKithv_QJG");
})();

// Close mobile menu when clicking navigation links or close button
document.addEventListener('DOMContentLoaded', function() {
  const body = document.body;
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelectorAll('.glass-navbar a');
  const closeButton = document.querySelector('.menu-close');
  const menuIcon = document.querySelector('.menu-icon');

  // Duplicate each marquee track's cards so the -50% loop is seamless.
  // Clones are inert: hidden from assistive tech and not focusable.
  document.querySelectorAll(
    '.experience-carousel__track--leadership, .experience-carousel__track--work'
  ).forEach(track => {
    Array.from(track.children).forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('a, button, input').forEach(el => {
        el.setAttribute('tabindex', '-1');
      });
      if (clone.tagName === 'A') clone.setAttribute('tabindex', '-1');
      track.appendChild(clone);
    });
  });

  // Touch users can't hover to pause the marquees — let them press instead
  document.querySelectorAll('.experience-carousel').forEach(carousel => {
    carousel.addEventListener('touchstart', () => carousel.classList.add('is-paused'), { passive: true });
    carousel.addEventListener('touchend', () => {
      setTimeout(() => carousel.classList.remove('is-paused'), 1200);
    }, { passive: true });
  });

  const openMenu = () => {
    body.classList.add('menu-open');
    if (menuToggle) menuToggle.checked = true;
  };

  const closeMenu = () => {
    body.classList.remove('menu-open');
    if (menuToggle) menuToggle.checked = false;
  };

  // Open menu when hamburger icon is clicked
  if (menuIcon) {
    menuIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu();
    });
  }

  // Close menu when close button is clicked
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
    });
  }

  // Close menu when any navigation link is clicked
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Experience cards glow toggle
  const glowToggle = document.getElementById('experience-toggle-input');
  const experienceGrid = document.querySelector('.experience-grid');

  if (glowToggle && experienceGrid) {
    glowToggle.addEventListener('change', () => {
      if (glowToggle.checked) {
        experienceGrid.classList.add('glow-active');
      } else {
        experienceGrid.classList.remove('glow-active');
      }
    });
  }

  // Achievements Carousel
  const carouselRoot = document.querySelector('.achievements-carousel');
  const carouselDots = document.querySelectorAll('.carousel-dot');
  const carouselTrack = document.querySelector('.carousel-track');
  const carouselSlides = document.querySelectorAll('.carousel-slide');
  const carouselCounter = document.getElementById('carouselCurrent');
  const carouselPrev = document.querySelector('.carousel-nav--prev');
  const carouselNext = document.querySelector('.carousel-nav--next');
  let currentSlide = 0;
  let autoSlideInterval;
  let dragOffset = 0;

  function slideMetrics() {
    const isMobile = window.innerWidth <= 768;
    return {
      width: isMobile ? 85 : 70,   // slide width, % of the viewport-ish track
      gap: isMobile ? 1.5 : 2      // gap expressed in the same units
    };
  }

  function positionTrack(index, pixelOffset) {
    if (!carouselTrack || !carouselSlides.length) return;
    const { width, gap } = slideMetrics();
    const centerOffset = (100 - width) / 2;
    const offset = index * (width + gap);
    // calc() needs an explicit operator with spaces — " + -45px" is invalid
    const px = Math.round(pixelOffset || 0);
    const drag = px === 0 ? '' : (px > 0 ? ` + ${px}px` : ` - ${Math.abs(px)}px`);
    carouselTrack.style.transform = `translateX(calc(${centerOffset}% - ${offset}%${drag}))`;
  }

  function showSlide(index) {
    if (!carouselSlides.length) return;
    // wrap around in both directions
    index = (index + carouselSlides.length) % carouselSlides.length;

    carouselDots.forEach(dot => dot.classList.remove('active'));
    if (carouselDots[index]) carouselDots[index].classList.add('active');

    carouselSlides.forEach(slide => slide.classList.remove('active'));
    if (carouselSlides[index]) carouselSlides[index].classList.add('active');

    if (carouselCounter) {
      carouselCounter.textContent = String(index + 1).padStart(2, '0');
    }

    positionTrack(index, 0);
    currentSlide = index;
  }

  // Re-center on resize
  window.addEventListener('resize', () => {
    showSlide(currentSlide);
  });

  function nextSlide() { showSlide(currentSlide + 1); }
  function prevSlide() { showSlide(currentSlide - 1); }

  // Auto-advance slides every 5 seconds
  function startAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(nextSlide, 5000);
  }

  function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
  }

  carouselDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      resetAutoSlide();
    });
  });

  if (carouselPrev) {
    carouselPrev.addEventListener('click', () => { prevSlide(); resetAutoSlide(); });
  }
  if (carouselNext) {
    carouselNext.addEventListener('click', () => { nextSlide(); resetAutoSlide(); });
  }

  // Click a neighbouring slide to bring it to the front
  carouselSlides.forEach((slide, index) => {
    slide.addEventListener('click', () => {
      if (index !== currentSlide && Math.abs(dragOffset) < 6) {
        showSlide(index);
        resetAutoSlide();
      }
    });
  });

  if (carouselRoot && carouselSlides.length) {
    // Pause while the pointer is over it or it has keyboard focus
    carouselRoot.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
    carouselRoot.addEventListener('mouseleave', startAutoSlide);
    carouselRoot.addEventListener('focusin', () => clearInterval(autoSlideInterval));
    carouselRoot.addEventListener('focusout', startAutoSlide);

    // Arrow-key navigation once the carousel is scrolled into view
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const rect = carouselRoot.getBoundingClientRect();
      const mostlyVisible = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4;
      if (!mostlyVisible) return;

      if (e.key === 'ArrowLeft') prevSlide(); else nextSlide();
      resetAutoSlide();
    });

    // Swipe / drag
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let locked = false;

    carouselRoot.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      locked = false;
      startX = e.clientX;
      startY = e.clientY;
      dragOffset = 0;
      clearInterval(autoSlideInterval);
    });

    carouselRoot.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Let vertical scrolling win unless the gesture is clearly horizontal
      if (!locked) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) { dragging = false; return; }
        locked = true;
        carouselRoot.classList.add('is-dragging');
      }

      dragOffset = dx;
      positionTrack(currentSlide, dx * 0.85);
    }, { passive: true });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      carouselRoot.classList.remove('is-dragging');

      const threshold = Math.min(90, carouselRoot.offsetWidth * 0.12);
      if (dragOffset > threshold) prevSlide();
      else if (dragOffset < -threshold) nextSlide();
      else positionTrack(currentSlide, 0);

      startAutoSlide();
      setTimeout(() => { dragOffset = 0; }, 50);
    }

    carouselRoot.addEventListener('pointerup', endDrag);
    carouselRoot.addEventListener('pointercancel', endDrag);
    carouselRoot.addEventListener('pointerleave', endDrag);

    showSlide(0);
    startAutoSlide();
  }

  // ============================= 
  // Projects Carousel Navigation
  // ============================= 
  const projectsTrack = document.querySelector('.projects-carousel__track');
  const projectsCards = document.querySelectorAll('.project-card');
  const prevButton = document.querySelector('.projects-carousel__nav--prev');
  const nextButton = document.querySelector('.projects-carousel__nav--next');
  
  let projectCurrentIndex = 0;
  const cardWidth = 380; // card width
  const cardGap = 30; // gap between cards
  const cardTotal = cardWidth + cardGap;

  function updateProjectsCarousel() {
    if (projectsTrack) {
      const offset = -projectCurrentIndex * cardTotal;
      projectsTrack.style.transform = `translateX(${offset}px)`;
    }
  }

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      if (projectCurrentIndex > 0) {
        projectCurrentIndex--;
        updateProjectsCarousel();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const maxIndex = projectsCards.length - Math.floor(window.innerWidth / cardTotal);
      if (projectCurrentIndex < maxIndex) {
        projectCurrentIndex++;
        updateProjectsCarousel();
      }
    });
  }

  // Reset carousel on window resize
  window.addEventListener('resize', () => {
    projectCurrentIndex = 0;
    updateProjectsCarousel();
  });

  // Contact Form Handler
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');

  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const submitBtn = contactForm.querySelector('.contact-submit-btn');
      const btnText = submitBtn.querySelector('span');
      const originalText = btnText.textContent;
      
      // Disable button and show loading state
      submitBtn.disabled = true;
      btnText.textContent = 'Sending...';
      formStatus.textContent = '';
      formStatus.className = 'form-status';
      
      // Send email using EmailJS
      emailjs.sendForm('service_o2idb4e', 'template_1gpm1wq', this)
        .then(function(response) {
          console.log('SUCCESS!', response.status, response.text);
          formStatus.textContent = '✓ Message sent successfully! I\'ll get back to you soon.';
          formStatus.className = 'form-status success';
          contactForm.reset();
          
          // Re-enable button
          submitBtn.disabled = false;
          btnText.textContent = originalText;
        }, function(error) {
          console.log('FAILED...', error);
          formStatus.textContent = '✗ Failed to send message. Please try again or email me directly.';
          formStatus.className = 'form-status error';
          
          // Re-enable button
          submitBtn.disabled = false;
          btnText.textContent = originalText;
        });
    });
  }
});

// Tic Tac Toe Game Logic
(function() {
  let gameBoard = ['', '', '', '', '', '', '', '', ''];
  let gameActive = false;
  let humanPlayer = 'X';
  let computerPlayer = 'O';
  const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  const startBtn = document.getElementById('tictactoe-start');
  const messageDisplay = document.getElementById('tictactoe-message');
  const cells = document.querySelectorAll('.tictactoe-cell');

  // The game only exists on the home page
  if (!startBtn || !messageDisplay || !cells.length) return;

  function resetGame() {
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    messageDisplay.textContent = 'Your turn (X)';
    cells.forEach(cell => {
      cell.textContent = '';
      cell.disabled = false;
      cell.classList.remove('is-win');
    });
  }

  function winningLine(player) {
    return winningConditions.find(condition => {
      return condition.every(index => gameBoard[index] === player);
    });
  }

  function checkWinner(player) {
    return Boolean(winningLine(player));
  }

  function highlightWin(player) {
    const line = winningLine(player);
    if (!line) return;
    line.forEach(index => cells[index].classList.add('is-win'));
  }

  function isBoardFull() {
    return gameBoard.every(cell => cell !== '');
  }

  function computerMove() {
    // Check if computer can win
    for (let i = 0; i < gameBoard.length; i++) {
      if (gameBoard[i] === '') {
        gameBoard[i] = computerPlayer;
        if (checkWinner(computerPlayer)) {
          cells[i].textContent = computerPlayer;
          messageDisplay.textContent = 'Aditya wins! (O)';
          highlightWin(computerPlayer);
          gameActive = false;
          return;
        }
        gameBoard[i] = '';
      }
    }

    // Check if human can win and block
    for (let i = 0; i < gameBoard.length; i++) {
      if (gameBoard[i] === '') {
        gameBoard[i] = humanPlayer;
        if (checkWinner(humanPlayer)) {
          gameBoard[i] = computerPlayer;
          cells[i].textContent = computerPlayer;
          messageDisplay.textContent = 'Computer blocked your move!';
          return;
        }
        gameBoard[i] = '';
      }
    }

    // Take center if available
    if (gameBoard[4] === '') {
      gameBoard[4] = computerPlayer;
      cells[4].textContent = computerPlayer;
      return;
    }

    // Random move
    let availableMoves = gameBoard
      .map((cell, index) => (cell === '' ? index : null))
      .filter(val => val !== null);

    if (availableMoves.length > 0) {
      let randomIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      gameBoard[randomIndex] = computerPlayer;
      cells[randomIndex].textContent = computerPlayer;
    }
  }

  startBtn.addEventListener('click', resetGame);

  cells.forEach(cell => {
    cell.addEventListener('click', function() {
      if (!gameActive || this.textContent !== '') return;

      const index = this.getAttribute('data-index');
      gameBoard[index] = humanPlayer;
      this.textContent = humanPlayer;

      if (checkWinner(humanPlayer)) {
        messageDisplay.textContent = 'You win! (X)';
        highlightWin(humanPlayer);
        gameActive = false;
        return;
      }

      if (isBoardFull()) {
        messageDisplay.textContent = "It's a draw!";
        gameActive = false;
        return;
      }

      messageDisplay.textContent = 'Aditya is thinking...';
      setTimeout(() => {
        computerMove();

        if (checkWinner(computerPlayer)) {
          messageDisplay.textContent = 'Aditya wins! (O)';
          highlightWin(computerPlayer);
          gameActive = false;
          return;
        }

        if (isBoardFull()) {
          messageDisplay.textContent = "It's a draw!";
          gameActive = false;
          return;
        }

        messageDisplay.textContent = 'Your turn (X)';
      }, 500);
    });
  });
})();

// Resume Button Handler
(function () {
  const resumeButtons = document.querySelectorAll(
    '.resume-download-btn, .review-badge[href*="resume"], a[href*="resume"]'
  );

  resumeButtons.forEach(button => {
    button.addEventListener('click', function (e) {
      e.preventDefault();

      // Create a temporary download link
      const link = document.createElement('a');
      link.href = 'assets/CV_Aditya_Ahirrao.pdf'; // Path to your resume
      link.download = 'CV_Aditya_Ahirrao.pdf'; // Downloaded file name

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });
})();
