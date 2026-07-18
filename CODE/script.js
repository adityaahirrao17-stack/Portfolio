// Portfolio JavaScript
// Liquid Glass effect is handled via CSS backdrop-filter with SVG filter

// Intro greeting animation
(function() {
  const introLoader = document.getElementById('introLoader');
  const introWord = document.getElementById('introLoaderWord');
  const greetings = ['Hello', 'Namaste', 'Bonjour', 'Hola', 'Konnichiwa', 'Ciao'];

  if (!introLoader || !introWord) return;

  document.body.classList.add('intro-lock');

  greetings.forEach((greeting, index) => {
    setTimeout(() => {
      introWord.classList.remove('is-switching');
      introWord.textContent = greeting;
      void introWord.offsetWidth;
      introWord.classList.add('is-switching');
    }, index * 760);
  });

  setTimeout(() => {
    introLoader.classList.add('is-hidden');
    document.body.classList.remove('intro-lock');
  }, 5000);

  setTimeout(() => {
    introLoader.remove();
  }, 5800);
})();

// Initialize EmailJS
(function() {
  emailjs.init("tNoh2RcQKithv_QJG");
})();

// Close mobile menu when clicking navigation links or close button
document.addEventListener('DOMContentLoaded', function() {
  const body = document.body;
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelectorAll('.glass-navbar a');
  const closeButton = document.querySelector('.menu-close');
  const menuIcon = document.querySelector('.menu-icon');

  document.querySelectorAll('.experience-carousel__track--leadership').forEach(track => {
    Array.from(track.children).forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
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
  const carouselDots = document.querySelectorAll('.carousel-dot');
  const carouselTrack = document.querySelector('.carousel-track');
  const carouselSlides = document.querySelectorAll('.carousel-slide');
  let currentSlide = 0;
  let autoSlideInterval;

  function showSlide(index) {
    // Update dots
    carouselDots.forEach(dot => dot.classList.remove('active'));
    if (carouselDots[index]) carouselDots[index].classList.add('active');
    
    // Update slide active state
    carouselSlides.forEach(slide => slide.classList.remove('active'));
    if (carouselSlides[index]) carouselSlides[index].classList.add('active');
    
    // Calculate offset: center the active slide with partial visibility of prev/next
    if (carouselTrack && carouselSlides.length > 0) {
      const isMobile = window.innerWidth <= 768;
      const slideWidth = isMobile ? 85 : 70; // percentage
      const gapPercent = isMobile ? 1.5 : 2; // accounts for gap
      const centerOffset = (100 - slideWidth) / 2; // center the slide
      const offset = index * (slideWidth + gapPercent);
      carouselTrack.style.transform = `translateX(calc(${centerOffset}% - ${offset}%))`; 
    }
    currentSlide = index;
  }

  // Re-center on resize
  window.addEventListener('resize', () => {
    showSlide(currentSlide);
  });

  function nextSlide() {
    const next = (currentSlide + 1) % carouselSlides.length;
    showSlide(next);
  }

  // Auto-advance slides every 4 seconds
  function startAutoSlide() {
    autoSlideInterval = setInterval(nextSlide, 4000);
  }

  function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
  }

  // Click on dots to navigate
  carouselDots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      resetAutoSlide();
    });
  });

  // Start auto-slide if carousel exists
  if (carouselSlides.length > 0) {
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

  function resetGame() {
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    messageDisplay.textContent = 'Your turn (X)';
    cells.forEach(cell => {
      cell.textContent = '';
      cell.disabled = false;
    });
  }

  function checkWinner(player) {
    return winningConditions.some(condition => {
      return condition.every(index => gameBoard[index] === player);
    });
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
      link.download = 'Aditya_Ahirrao_Resume.pdf'; // Downloaded file name

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });
})();
