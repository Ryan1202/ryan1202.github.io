/* =========================================================
   Jiajun Wang — personal site
   Vanilla JS, no dependencies.
   ========================================================= */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  var THEME_KEY = 'jw-theme';
  var themeBtn = document.getElementById('theme');

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0b0d' : '#f3f0e9');
  }

  setTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- header + scroll progress ---------- */
  var head = document.getElementById('head');
  var progress = document.getElementById('progress');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    if (head) head.classList.toggle('scrolled', y > 12);
    if (progress) {
      var ratio = max > 0 ? Math.min(y / max, 1) : 0;
      progress.style.transform = 'scaleX(' + ratio + ')';
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  /* ---------- terminal boot sequence ---------- */
  var termLines = Array.prototype.slice.call(document.querySelectorAll('[data-line]'));

  if (termLines.length) {
    if (reduceMotion) {
      termLines.forEach(function (line) { line.classList.add('on'); });
    } else {
      termLines.forEach(function (line, i) {
        window.setTimeout(function () {
          line.classList.add('on');
        }, 500 + i * 240);
      });
    }
  }

  /* ---------- scroll reveal ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- active navigation link ---------- */
  var sections = ['work', 'stack', 'about', 'contact']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));

  function markActive(id) {
    navLinks.forEach(function (link) {
      var isActive = link.getAttribute('href') === '#' + id;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) markActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  /* ---------- top-level navigation menus ---------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var menus = Array.from(nav.querySelectorAll('.nav-group'), function (group) {
      return {
        group: group,
        link: group.querySelector('.nav-root'),
        panel: group.querySelector('.nav-submenu'),
        links: group.querySelector('.nav-links')
      };
    });

    function isOpen(menu) {
      return menu.link.getAttribute('aria-expanded') === 'true';
    }

    var currentMenu = menus.find(isOpen);

    function measureMenu(menu) {
      var width = menu.links.getBoundingClientRect().width;
      menu.panel.style.setProperty('--submenu-width', width + 'px');
    }

    function openMenu(selected) {
      menus.forEach(function (menu) {
        var open = menu === selected;
        menu.link.setAttribute('aria-expanded', String(open));
        menu.panel.inert = !open;
      });
      if (selected && reduceMotion) revealMenu(selected);
    }

    function revealMenu(menu) {
      if (!isOpen(menu)) return;

      var bounds = nav.getBoundingClientRect();
      // Keep the preceding group reachable when the open menu exceeds the viewport.
      var leading = menu.group.previousElementSibling || menu.group;
      var left = leading.getBoundingClientRect().left - bounds.left;
      var right = menu.panel.getBoundingClientRect().right - bounds.right;
      if (left < 0) nav.scrollLeft += Math.floor(left);
      else if (right > 0) nav.scrollLeft += Math.floor(Math.min(left, right));
    }

    menus.forEach(function (menu) {
      menu.group.addEventListener('pointerenter', function (event) {
        if (event.pointerType === 'mouse' && !isOpen(menu)) openMenu(menu);
      });

      menu.link.addEventListener('focus', function () {
        if (!isOpen(menu)) openMenu(menu);
      });

      menu.panel.addEventListener('transitionend', function (event) {
        if (event.propertyName === 'width') revealMenu(menu);
      });

      measureMenu(menu);
      revealMenu(menu);
    });

    var menuSize = new ResizeObserver(function () {
      menus.forEach(measureMenu);
    });
    menus.forEach(function (menu) { menuSize.observe(menu.links); });
    nav.classList.add('is-ready');

    nav.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'mouse' && !nav.contains(document.activeElement) &&
          menus.some(isOpen)) openMenu(currentMenu);
    });

    nav.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;

      var menu = menus.find(isOpen);
      if (!menu) return;

      event.preventDefault();
      menu.link.focus();
      openMenu(null);
    });

    document.addEventListener('pointerdown', function (event) {
      if (!nav.contains(event.target)) openMenu(null);
    });
  }

  /* ---------- GitHub profile and Horizon activity ---------- */
  var avatar = document.getElementById('github-avatar');
  if (avatar) {
    function useLocalAvatar() {
      avatar.src = avatar.dataset.fallback;
    }

    if (avatar.complete && !avatar.naturalWidth) useLocalAvatar();
    else avatar.addEventListener('error', useLocalAvatar, { once: true });
  }

  var commitLink = document.getElementById('horizon-commit');
  if (commitLink) {
    var repoApi = 'https://api.github.com/repos/Ryan1202/Horizon-Operating-System';

    fetch(repoApi)
      .then(function (response) {
        if (response.ok) return response.json();
      })
      .then(function (repo) {
        if (!repo || !repo.default_branch) return;

        var branch = encodeURIComponent(repo.default_branch);
        return fetch(repoApi + '/commits?sha=' + branch + '&per_page=1');
      })
      .then(function (response) {
        if (response && response.ok) return response.json();
      })
      .then(function (commits) {
        var latest = commits && commits[0];
        if (!latest) return;

        var subject = latest.commit.message.split(/\r?\n/)[0];
        commitLink.textContent = latest.sha.slice(0, 7) + ' ' + subject;
        commitLink.href = latest.html_url;
      })
      .catch(function () {
        // Keep the link to GitHub's commit list if the API is unavailable.
      });
  }

  /* ---------- email ---------- */
  /* Built at runtime so the raw address never appears in the HTML source. */
  var mailRow = document.getElementById('mailRow');
  if (mailRow) {
    var address = 'ryan1202' + String.fromCharCode(64) + 'foxmail.com';
    mailRow.href = 'mailto:' + address;
    mailRow.setAttribute('aria-label', 'Email ryan1202 at foxmail dot com');
  }

  /* ---------- footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
