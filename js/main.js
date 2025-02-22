(function ($) {
    "use strict";
    $(window).on("load", function () {
        // makes sure the whole site is loaded
        //preloader
        $("#status").fadeOut(); // will first fade out the loading animation
        $("#preloader").delay(450).fadeOut("slow"); // will fade out the white DIV that covers the website.

        //masonry
        $(".grid").masonry({
            itemSelector: ".grid-item",
        });
    });

    $(document).ready(function () {
        //active menu
        $(document).on("scroll", onScroll);

        $('a[href^="#"]').on("click", function (e) {
            e.preventDefault();
            $(document).off("scroll");

            $("a").each(function () {
                $(this).removeClass("active");
            });
            $(this).addClass("active");

            var target = this.hash;
            $target = $(target);
            $("html, body")
                .stop()
                .animate(
                    {
                        scrollTop: $target.offset().top + 2,
                    },
                    500,
                    "swing",
                    function () {
                        window.location.hash = target;
                        $(document).on("scroll", onScroll);
                    }
                );
        });

        //scroll js
        smoothScroll.init({
            selector: "[data-scroll]", // Selector for links (must be a valid CSS selector)
            selectorHeader: "[data-scroll-header]", // Selector for fixed headers (must be a valid CSS selector)
            speed: 500, // Integer. How fast to complete the scroll in milliseconds
            easing: "easeInOutCubic", // Easing pattern to use
            updateURL: true, // Boolean. Whether or not to update the URL with the anchor hash on scroll
            offset: 0, // Integer. How far to offset the scrolling anchor location in pixels
            callback: function (toggle, anchor) {}, // Function to run after scrolling
        });

        //menu
        var bodyEl = document.body,
            content = document.querySelector(".content-wrap"),
            openbtn = document.getElementById("open-button"),
            closebtn = document.getElementById("close-button"),
            isOpen = false;

        function inits() {
            initEvents();
        }

        function initEvents() {
            openbtn.addEventListener("click", toggleMenu);
            if (closebtn) {
                closebtn.addEventListener("click", toggleMenu);
            }

            // close the menu element if the target it´s not the menu element or one of its descendants..
            content.addEventListener("click", function (ev) {
                var target = ev.target;
                if (isOpen && target !== openbtn) {
                    toggleMenu();
                }
            });
        }

        function toggleMenu() {
            if (isOpen) {
                classie.remove(bodyEl, "show-menu");
            } else {
                classie.add(bodyEl, "show-menu");
            }
            isOpen = !isOpen;
        }

        inits();

        //typed js
        $(".typed").typed({
            strings: ["blog跟skill搬家了~詳情右上角點擊~", "個人網站", "遊戲玩家"],
            typeSpeed: 100,
            backDelay: 2000,
            // loop
            loop: true,
        });

        //owl carousel
        $(".owl-carousel").owlCarousel({
            autoPlay: 5000, //Set AutoPlay to 3 seconds

            items: 1,
            itemsDesktop: [1199, 1],
            itemsDesktopSmall: [979, 1],
            itemsTablet: [768, 1],
            itemsMobile: [479, 1],

            // CSS Styles
            baseClass: "owl-carousel",
            theme: "owl-theme",
        });

        $(".owl-carousel2").owlCarousel({
            autoPlay: 3000, //Set AutoPlay to 3 seconds

            items: 1,
            itemsDesktop: [1199, 1],
            itemsDesktopSmall: [979, 1],
            itemsTablet: [768, 1],
            itemsMobile: [479, 1],
            autoPlay: false,

            // CSS Styles
            baseClass: "owl-carousel",
            theme: "owl-theme",
        });

        //contact
        $("input").blur(function () {
            // check if the input has any value (if we've typed into it)
            if ($(this).val()) $(this).addClass("used");
            else $(this).removeClass("used");
        });

        //pop up porfolio
        $(".portfolio-image li a").magnificPopup({
            type: "image",
            gallery: {
                enabled: true,
            },
            // other options
        });

        //Skill
        jQuery(".skillbar").each(function () {
            jQuery(this).appear(function () {
                jQuery(this)
                    .find(".count-bar")
                    .animate(
                        {
                            width: jQuery(this).attr("data-percent"),
                        },
                        3000
                    );
                var percent = jQuery(this).attr("data-percent");
                jQuery(this)
                    .find(".count")
                    .html("<span>" + percent + "</span>");
            });
        });
    });

    //header
    function inits() {
        window.addEventListener("scroll", function (e) {
            var distanceY = window.pageYOffset || document.documentElement.scrollTop,
                shrinkOn = 300,
                header = document.querySelector(".for-sticky");
            if (distanceY > shrinkOn) {
                classie.add(header, "opacity-nav");
            } else {
                if (classie.has(header, "opacity-nav")) {
                    classie.remove(header, "opacity-nav");
                }
            }
        });
    }

    window.onload = inits();

    //fuck off
    document.onkeydown = function () {
        if (event.ctrlKey && window.event.keyCode == 85) {
            return false;
        }
        if (window.event.keyCode == 123) {
            return false;
        }
        if (event.ctrlKey && window.event.keyCode == 83) {
            return false;
        }
        if (window.event && window.event.keyCode == 116) {
            return false;
        }
        if (event.ctrlKey) {
            return false;
        }
    };

    const audioElement = document.getElementById("audio1");
    audioElement.volume = 0.2;

    function playAudio() {
        audioElement
            .play()
            .then(() => {
                console.log("音頻已播放！");
            })
            .catch((error) => {
                console.log("播放失敗：", error);
            });
    }

    alert(
        "歡迎來到子彈的個人網站, 以下為你介紹及更新:\n\n    ●右上角為menu, 音機相關跟blog單獨開一個頁面出來\n    ●往下滑有我的自介及常駐點, 可以認識(基本上都打k社的台)\n    ●本人為社恐, 如在Thread上認識的話請記得戳我\n\n以下為最近更新及預想更新\n    ○大更新自介, skills相關\n    ○新增一首歌, 可以邊聽邊看, 歌名為'地球最浪漫的一首歌'\n\n    ▲之後更新會把blog跟更新分開來放"
    );

    //nav-active
    function onScroll(event) {
        var scrollPosition = $(document).scrollTop();
        $(".menu-list a").each(function () {
            var currentLink = $(this);
            var refElement = $(currentLink.attr("href"));
            if (refElement.position().top <= scrollPosition && refElement.position().top + refElement.height() > scrollPosition) {
                $(".menu-list a").removeClass("active");
                currentLink.addClass("active");
            } else {
                currentLink.removeClass("active");
            }
        });
    }
})(jQuery);
