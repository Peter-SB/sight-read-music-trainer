function getNoteNumberByClassAttr(t) {
    var i = t.match(/instrument-button-(\d+)/);
    return parseInt(i[1])
}
function getFingeringChartByNoteNumber(t, i) {
    var n = NOTES[t][i];
    return n ? n.fingering : void 0
}
function getNoteAudio(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null
        , n = NOTES[t]
        , e = getSubInstrument();
    if (n) {
        if (void 0 === audios[t] || void 0 === audios[t][e]) {
            var a = document.createElement("audio");
            null !== i && a.addEventListener("canplay", i),
                a.src = window.cdnDomain + "/" + n[e].audio,
                a.load(),
                void 0 === audios[t] && (audios[t] = []),
                audios[t][e] = a
        }
        return audios[t][e]
    }
}
function setCurrentPlayingAudio(t) {
    currentPlayingAudioNumber = t
}
function stopCurrentPlayingNote() {
    null !== currentPlayingAudioNumber && audios[currentPlayingAudioNumber][getSubInstrument()] && (audios[currentPlayingAudioNumber][getSubInstrument()].pause(),
        currentPlayingAudioNumber = null),
        instrument.clearAll()
}
function playNote(t, i) {
    null !== t && (t.currentTime = 0,
        t.play(),
        t.addEventListener("ended", function () {
            setCurrentPlayingAudio(null)
        })),
        i.forEach(function (t) {
            instrument.drawButton(t)
        })
}
function disableStaff() {
    $(".visual-instrument__notes").addClass("disabled")
}
function enableStaff() {
    $(".visual-instrument__notes").removeClass("disabled")
}
function isStaffDisabled() {
    return $(".visual-instrument__notes").hasClass("disabled")
}
function Saxophone(t) {
    var i = this
        , n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "";
    this.image = t,
        this.cdnDomain = n,
        this.loader = $("#visual-instrument-loader"),
        this.loader.show(),
        this.instrumentNotes = $(".visual-instrument__notes"),
        this.loadedButtonsCount = 0,
        this.totalButtonsCount = 25,
        $(this.image).on("button.loaded", function () {
            ++i.loadedButtonsCount === i.totalButtonsCount && $(t).trigger("instrument.loaded")
        }),
        this.buttons = [new Button0(t, n), new Button1(t, n), new Button2(t), new Button3(t), new Button4(t), new Button5(t, n), new Button6(t, n), new Button7(t, n), new Button8(t, n), new Button9(t, n), new Button10(t, n), new Button11(t, n), new Button12(t, n), new Button13(t, n), new Button14(t), new Button15(t), new Button16(t), new Button17(t), new Button18(t), new Button19(t), new Button20(t, n), new Button21(t), new Button22(t, n), new Button0(t, n, !0), new Button1(t, n, !0), new Button2(t, !0), new Button3(t, !0), new Button4(t, !0), new Button5(t, n, !0), new Button6(t, n, !0), new Button7(t, n, !0), new Button8(t, n, !0), new Button9(t, n, !0), new Button10(t, n, !0), new Button11(t, n, !0), new Button12(t, n, !0), new Button13(t, n, !0), new Button14(t, !0), new Button15(t, !0), new Button16(t, !0), new Button17(t, !0), new Button18(t, !0), new Button19(t, !0), new Button20(t, n, !0), new Button21(t, !0), new Button22(t, n, !0)],
        this.drawButton = function (t) {
            this.buttons[t].draw()
        }
        ,
        this.clearButton = function (t) {
            this.buttons[t].clear()
        }
        ,
        this.clearAll = function () {
            this.buttons.forEach(function (t) {
                t.clear()
            })
        }
        ,
        this.showLoader = function () {
            $(this.loader).show()
        }
        ,
        this.hideLoader = function () {
            $(this.loader).hide()
        }
}
function BaseButton(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.instrumentImage = t,
        this.cdnDomain = i,
        this.isAdditionalSection = n,
        !0 === this.isAdditionalSection ? this.schematicSectionImage = $("#instrument-chart-image-1") : this.schematicSectionImage = $("#instrument-chart-image-0"),
        this.createCanvas = function (t) {
            var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1]
                , n = document.createElement("canvas");
            return n.setAttribute("id", t),
                n.setAttribute("width", "100%"),
                this.instrumentImage.after(n),
                !0 === i && $(this.instrumentImage).trigger("button.loaded"),
                n
        }
        ,
        this.createImage = function (i) {
            var n = new Image;
            return n.onload = function () {
                $(t).trigger("button.loaded")
            }
                ,
                n.src = i,
                n
        }
        ,
        this.blink = function (t) {
            this.draw(),
                window.setTimeout(function (t) {
                    return function () {
                        t.clear()
                    }
                }(this), t)
        }
        ,
        this.draw = function () {
            this.updateCanvasSize();
            var t = this.getCanvasContext()
                , i = $(this.schematicSectionImage)
                , n = parseInt(i.css("margin-left"), 10);
            !0 === this.isAdditionalSection ? (n += i.width(),
                n += parseInt(i.css("margin-left"), 10),
                i.show()) : t.drawImage(this.buttonImages.main, 0, 0, this.instrumentImage.width(), this.instrumentImage.height()),
                t.drawImage(this.buttonImages.schematicSection, n, 0, i.width(), i.height())
        }
        ,
        this.clear = function () {
            this.getCanvasContext().clearRect(0, 0, this.canvas.width, this.canvas.height),
                !0 === this.isAdditionalSection && $(this.schematicSectionImage).hide()
        }
        ,
        this.updateCanvasSize = function () {
            this.canvas.width = this.instrumentImage.width(),
                this.canvas.height = this.instrumentImage.height()
        }
        ,
        this.getCanvasContext = function () {
            var t = this.canvas.getContext("2d");
            return t.globalAlpha = .75,
                t.shadowColor = "red",
                t.shadowBlur = 10,
                t
        }
        ,
        this.getImageUrl = function (t) {
            return (this.cdnDomain ? this.cdnDomain + "/" : "") + "images/fingering-charts/instruments/saxophone/" + t + ".png"
        }
}
function Button0(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-0"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-right-hand-r6")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-right-hand-r6"))
        }
}
function Button1(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-1"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-right-hand-r5")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-right-hand-r5"))
        }
}
function Button2(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-2", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            }
            t.beginPath(),
                t.arc(i.main.x, i.main.y, n.main, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill(),
                t.beginPath(),
                t.arc(i.schematicSection.x, i.schematicSection.y, n.schematicSection, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .754 * this.instrumentImage.width(),
                    y: .82 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .074 * this.instrumentImage.width() + t,
                    y: .8 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: .01 * this.instrumentImage.width(),
                schematicSection: .022 * this.instrumentImage.width()
            }
        }
}
function Button3(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-3", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            }
            t.beginPath(),
                t.arc(i.main.x, i.main.y, n.main, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill(),
                t.beginPath(),
                t.arc(i.schematicSection.x, i.schematicSection.y, n.schematicSection, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .743 * this.instrumentImage.width(),
                    y: .752 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .074 * this.instrumentImage.width() + t,
                    y: .676 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: .01 * this.instrumentImage.width(),
                schematicSection: .022 * this.instrumentImage.width()
            }
        }
}
function Button4(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-4", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            }
            t.beginPath(),
                t.arc(i.main.x, i.main.y, n.main, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill(),
                t.beginPath(),
                t.arc(i.schematicSection.x, i.schematicSection.y, n.schematicSection, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .725 * this.instrumentImage.width(),
                    y: .676 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .074 * this.instrumentImage.width() + t,
                    y: .554 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: .01 * this.instrumentImage.width(),
                schematicSection: .022 * this.instrumentImage.width()
            }
        }
}
function Button5(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-5"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-right-hand-extra")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-right-hand-extra"))
        }
}
function Button6(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-6"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-right-hand-r4")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-right-hand-r4"))
        }
}
function Button7(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-7"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-right-hand-r3")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-right-hand-r3"))
        }
}
function Button8(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-8"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-right-hand-r2")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-right-hand-r2"))
        }
}
function Button9(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-9"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-right-hand-r1")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-right-hand-r1"))
        }
}
function Button10(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-10"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-left-hand-l7")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-left-hand-l7"))
        }
}
function Button11(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-11"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-left-hand-l5")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-left-hand-l5"))
        }
}
function Button12(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-12"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-left-hand-l6")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-left-hand-l6"))
        }
}
function Button13(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-13"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-left-hand-l4")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-left-hand-l4"))
        }
}
function Button14(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-14", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            }
            t.beginPath(),
                t.arc(i.main.x, i.main.y, n.main, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill(),
                t.beginPath(),
                t.arc(i.schematicSection.x, i.schematicSection.y, n.schematicSection, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .664 * this.instrumentImage.width(),
                    y: .27 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .074 * this.instrumentImage.width() + t,
                    y: .4 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: .01 * this.instrumentImage.width(),
                schematicSection: .022 * this.instrumentImage.width()
            }
        }
}
function Button15(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-15", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            }
            t.beginPath(),
                t.arc(i.main.x, i.main.y, n.main, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill(),
                t.beginPath(),
                t.arc(i.schematicSection.x, i.schematicSection.y, n.schematicSection, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .642 * this.instrumentImage.width(),
                    y: .264 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .074 * this.instrumentImage.width() + t,
                    y: .277 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: .01 * this.instrumentImage.width(),
                schematicSection: .022 * this.instrumentImage.width()
            }
        }
}
function Button16(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-16", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            }
            t.beginPath(),
                t.arc(i.main.x, i.main.y, n.main, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill(),
                t.beginPath(),
                t.arc(i.schematicSection.x, i.schematicSection.y, n.schematicSection, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .631 * this.instrumentImage.width(),
                    y: .228 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .095 * this.instrumentImage.width() + t,
                    y: .215 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: .008 * this.instrumentImage.width(),
                schematicSection: .01 * this.instrumentImage.width()
            }
        }
}
function Button17(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-17", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            }
            t.beginPath(),
                t.arc(i.main.x, i.main.y, n.main, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill(),
                t.beginPath(),
                t.arc(i.schematicSection.x, i.schematicSection.y, n.schematicSection, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .624 * this.instrumentImage.width(),
                    y: .195 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .074 * this.instrumentImage.width() + t,
                    y: .154 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: .01 * this.instrumentImage.width(),
                schematicSection: .022 * this.instrumentImage.width()
            }
        }
}
function Button18(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-18", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            } else
                t.beginPath(),
                    t.ellipse(i.main.x, i.main.y, n.main.x, n.main.y, 2.68, 2 * Math.PI, !1),
                    t.fillStyle = "red",
                    t.fill();
            t.beginPath(),
                t.arc(i.schematicSection.x, i.schematicSection.y, n.schematicSection, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .61 * this.instrumentImage.width(),
                    y: .16 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .074 * this.instrumentImage.width() + t,
                    y: .073 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: {
                    x: .007 * this.instrumentImage.width(),
                    y: .013 * this.instrumentImage.width()
                },
                schematicSection: .01 * this.instrumentImage.width()
            }
        }
}
function Button19(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-19", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            } else
                t.beginPath(),
                    t.ellipse(i.main.x, i.main.y, n.main.x, n.main.y, 2.5, 2 * Math.PI, !1),
                    t.fillStyle = "red",
                    t.fill();
            t.beginPath(),
                t.ellipse(i.schematicSection.x, i.schematicSection.y, n.schematicSection.x, n.schematicSection.y, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .667 * this.instrumentImage.width(),
                    y: .198 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .114 * this.instrumentImage.width() + t,
                    y: .192 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: {
                    x: .005 * this.instrumentImage.width(),
                    y: .013 * this.instrumentImage.width()
                },
                schematicSection: {
                    x: .005 * this.instrumentImage.width(),
                    y: .015 * this.instrumentImage.width()
                }
            }
        }
}
function Button20(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-20", !0),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-left-hand-l2"))
        },
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            } else
                t.drawImage(this.buttonImages.main, 0, 0, this.instrumentImage.width(), this.instrumentImage.height());
            t.beginPath(),
                t.ellipse(i.schematicSection.x, i.schematicSection.y, n.schematicSection.x, n.schematicSection.y, 0, 2 * Math.PI, !1),
                t.fillStyle = "red",
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: null,
                    y: null
                },
                schematicSection: {
                    x: .127 * this.instrumentImage.width() + t,
                    y: .155 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: null,
                schematicSection: {
                    x: .005 * this.instrumentImage.width(),
                    y: .015 * this.instrumentImage.width()
                }
            }
        }
}
function Button21(t) {
    var i = arguments.length > 1 && void 0 !== arguments[1] && arguments[1];
    this.__proto__ = new BaseButton(t, null, i),
        this.canvas = this.createCanvas("saxophone-button-21", !0),
        this.draw = function () {
            this.updateCanvasSize(),
                this.canvas.style.webkitFilter = "blur(2.5px)";
            var t = this.getCanvasContext()
                , i = this.getOffset()
                , n = this.getRadius();
            if (!0 === this.isAdditionalSection) {
                var e = $(this.schematicSectionImage);
                e.show(),
                    i.schematicSection.x += e.width(),
                    i.schematicSection.x += parseInt(e.css("margin-left"), 10)
            } else
                t.beginPath(),
                    t.ellipse(i.main.x, i.main.y, n.main.x, n.main.y, 2.6, 2 * Math.PI, !1),
                    t.fillStyle = "red",
                    t.fill();
            t.beginPath(),
                t.fillStyle = "red",
                t.ellipse(i.schematicSection.x, i.schematicSection.y, n.schematicSection.x, n.schematicSection.y, 0, 2 * Math.PI, !1),
                t.fill()
        }
        ,
        this.getOffset = function () {
            var t = parseInt($(this.schematicSectionImage).css("margin-left"), 10);
            return {
                main: {
                    x: .648 * this.instrumentImage.width(),
                    y: .125 * this.instrumentImage.height()
                },
                schematicSection: {
                    x: .114 * this.instrumentImage.width() + t,
                    y: .115 * this.instrumentImage.height()
                }
            }
        }
        ,
        this.getRadius = function () {
            return {
                main: {
                    x: .005 * this.instrumentImage.width(),
                    y: .013 * this.instrumentImage.width()
                },
                schematicSection: {
                    x: .005 * this.instrumentImage.width(),
                    y: .015 * this.instrumentImage.width()
                }
            }
        }
}
function Button22(t, i) {
    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
    this.__proto__ = new BaseButton(t, i, n),
        this.canvas = this.createCanvas("saxophone-button-22"),
        this.buttonImages = {
            main: this.createImage(this.getImageUrl("sax-octave-key")),
            schematicSection: this.createImage(this.getImageUrl("section-keys/chart-octave-key"))
        }
}
function getSubInstrument() {
    return instrumentTypeSwitch.querySelector('[data-selected="true"]').dataset.type
}
var _slicedToArray = function () {
    function t(t, i) {
        var n = []
            , e = !0
            , a = !1
            , s = void 0;
        try {
            for (var o, r = t[Symbol.iterator](); !(e = (o = r.next()).done) && (n.push(o.value),
                !i || n.length !== i); e = !0)
                ;
        } catch (t) {
            a = !0,
                s = t
        } finally {
            try {
                !e && r.return && r.return()
            } finally {
                if (a)
                    throw s
            }
        }
        return n
    }
    return function (i, n) {
        if (Array.isArray(i))
            return i;
        if (Symbol.iterator in Object(i))
            return t(i, n);
        throw new TypeError("Invalid attempt to destructure non-iterable instance")
    }
}()
    , NOTES = {
        37: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/A3di.mp3",
                fingering: [0, 2, 3, 4, 10, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/Bb1.mp3",
                fingering: [0, 2, 3, 4, 10, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/Bb-1.mp3",
                fingering: [0, 2, 3, 4, 10, 14, 15, 17]
            }
        },
        38: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/B3.mp3",
                fingering: [0, 2, 3, 4, 11, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/B1.mp3",
                fingering: [0, 2, 3, 4, 11, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/B-1.mp3",
                fingering: [0, 2, 3, 4, 11, 14, 15, 17]
            }
        },
        39: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/C4.mp3",
                fingering: [0, 2, 3, 4, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/C2.mp3",
                fingering: [0, 2, 3, 4, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/C1.mp3",
                fingering: [0, 2, 3, 4, 14, 15, 17]
            }
        },
        40: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/C4di.mp3",
                fingering: [0, 2, 3, 4, 12, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/C2di.mp3",
                fingering: [0, 2, 3, 4, 12, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/C1di.mp3",
                fingering: [0, 2, 3, 4, 12, 14, 15, 17]
            }
        },
        41: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/D4.mp3",
                fingering: [2, 3, 4, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/D2.mp3",
                fingering: [2, 3, 4, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/D1.mp3",
                fingering: [2, 3, 4, 14, 15, 17]
            }
        },
        42: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/D4di.mp3",
                fingering: [1, 2, 3, 4, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/D2di.mp3",
                fingering: [1, 2, 3, 4, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/D1di.mp3",
                fingering: [1, 2, 3, 4, 14, 15, 17]
            }
        },
        43: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/E4.mp3",
                fingering: [3, 4, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/E2.mp3",
                fingering: [3, 4, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/E1.mp3",
                fingering: [3, 4, 14, 15, 17]
            }
        },
        44: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/F4.mp3",
                fingering: [4, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/F2.mp3",
                fingering: [4, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/F1.mp3",
                fingering: [4, 14, 15, 17]
            }
        },
        45: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/F4di.mp3",
                fingering: [3, 14, 15, 17, 27, 28, 37, 38, 40]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/F2di.mp3",
                fingering: [3, 14, 15, 17, 27, 28, 37, 38, 40]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/F1di.mp3",
                fingering: [3, 14, 15, 17, 27, 28, 37, 38, 40]
            }
        },
        46: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/G4.mp3",
                fingering: [14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/G2.mp3",
                fingering: [14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/G1.mp3",
                fingering: [14, 15, 17]
            }
        },
        47: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/G4di.mp3",
                fingering: [13, 14, 15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/G2di.mp3",
                fingering: [13, 14, 15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/G1di.mp3",
                fingering: [13, 14, 15, 17]
            }
        },
        48: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/A4.mp3",
                fingering: [15, 17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/A2.mp3",
                fingering: [15, 17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/A1.mp3",
                fingering: [15, 17]
            }
        },
        49: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/A4di.mp3",
                fingering: [16, 17, 30, 38, 40]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/A2di.mp3",
                fingering: [16, 17, 30, 38, 40]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/Bb1.mp3",
                fingering: [16, 17, 30, 38, 40]
            }
        },
        50: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/B4.mp3",
                fingering: [17]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/B2.mp3",
                fingering: [17]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/B1.mp3",
                fingering: [17]
            }
        },
        51: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/C5.mp3",
                fingering: [15]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/C3.mp3",
                fingering: [15]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/C2.mp3",
                fingering: [15]
            }
        },
        52: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/C5di.mp3",
                fingering: []
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/C3di.mp3",
                fingering: []
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/C2di.mp3",
                fingering: []
            }
        },
        53: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/D5.mp3",
                fingering: [2, 3, 4, 14, 15, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/D3.mp3",
                fingering: [2, 3, 4, 14, 15, 17, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/D2.mp3",
                fingering: [2, 3, 4, 14, 15, 17, 22]
            }
        },
        54: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/D5di.mp3",
                fingering: [1, 2, 3, 4, 14, 15, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/D3di.mp3",
                fingering: [1, 2, 3, 4, 14, 15, 17, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/D2di.mp3",
                fingering: [1, 2, 3, 4, 14, 15, 17, 22]
            }
        },
        55: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/E5.mp3",
                fingering: [3, 4, 14, 15, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/E3.mp3",
                fingering: [3, 4, 14, 15, 17, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/E2.mp3",
                fingering: [3, 4, 14, 15, 17, 22]
            }
        },
        56: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/F5.mp3",
                fingering: [4, 14, 15, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/F3.mp3",
                fingering: [4, 14, 15, 17, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/F2.mp3",
                fingering: [4, 14, 15, 17, 22]
            }
        },
        57: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/F5di.mp3",
                fingering: [3, 14, 15, 17, 22, 27, 28, 37, 38, 40, 45]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/F3di.mp3",
                fingering: [3, 14, 15, 17, 22, 27, 28, 37, 38, 40, 45]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/F2di.mp3",
                fingering: [3, 14, 15, 17, 22, 27, 28, 37, 38, 40, 45]
            }
        },
        58: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/G5.mp3",
                fingering: [14, 15, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/G3.mp3",
                fingering: [14, 15, 17, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/G2.mp3",
                fingering: [14, 15, 17, 22]
            }
        },
        59: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/G5di.mp3",
                fingering: [13, 14, 15, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/G3di.mp3",
                fingering: [13, 14, 15, 17, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/G2di.mp3",
                fingering: [13, 14, 15, 17, 22]
            }
        },
        60: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/A5.mp3",
                fingering: [15, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/A3.mp3",
                fingering: [15, 17, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/A2.mp3",
                fingering: [15, 17, 22]
            }
        },
        61: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/A5di.mp3",
                fingering: [16, 17, 22, 29, 37, 39, 44]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/A3di.mp3",
                fingering: [16, 17, 22, 29, 37, 39, 44]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/Bb2.mp3",
                fingering: [16, 17, 22, 29, 37, 39, 44]
            }
        },
        62: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/B5.mp3",
                fingering: [17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/B3.mp3",
                fingering: [17, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/B2.mp3",
                fingering: [17, 22]
            }
        },
        63: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/C6.mp3",
                fingering: [15, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/C4.mp3",
                fingering: [15, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/C3.mp3",
                fingering: [15, 22]
            }
        },
        64: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/C6di.mp3",
                fingering: [22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/C4di.mp3",
                fingering: [22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/C3di.mp3",
                fingering: [22]
            }
        },
        65: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/D6.mp3",
                fingering: [20, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/D4.mp3",
                fingering: [20, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/D3.mp3",
                fingering: [20, 22]
            }
        },
        66: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/D6di.mp3",
                fingering: [20, 21, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/D4di.mp3",
                fingering: [20, 21, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/D3di.mp3",
                fingering: [20, 21, 22]
            }
        },
        67: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/E6.mp3",
                fingering: [9, 20, 21, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/E4.mp3",
                fingering: [9, 20, 21, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/E3.mp3",
                fingering: [9, 20, 21, 22]
            }
        },
        68: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/F6.mp3",
                fingering: [9, 19, 20, 21, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/F4.mp3",
                fingering: [9, 19, 20, 21, 22]
            },
            soprano: {
                audio: "audio/visual-instruments/saxophone/soprano/F3.mp3",
                fingering: [9, 19, 20, 21, 22]
            }
        },
        69: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/F6di.mp3",
                fingering: [6, 9, 19, 20, 21, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/F4di.mp3",
                fingering: [6, 9, 19, 20, 21, 22]
            }
        },
        70: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/G6.mp3",
                fingering: [4, 7, 14, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/G4.mp3",
                fingering: [4, 7, 14, 17, 22]
            }
        },
        71: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/G6di.mp3",
                fingering: [4, 8, 14, 17, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/G4di.mp3",
                fingering: [4, 8, 14, 17, 22]
            }
        },
        72: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/A6.mp3",
                fingering: [2, 3, 4, 14, 15, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/A4.mp3",
                fingering: [2, 3, 4, 14, 15, 22]
            }
        },
        73: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/A6di.mp3",
                fingering: [3, 4, 14, 22]
            },
            tenor: {
                audio: "audio/visual-instruments/saxophone/tenor/A4di.mp3",
                fingering: [3, 4, 14, 22]
            }
        },
        74: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/B6.mp3",
                fingering: [8, 20, 22]
            }
        },
        75: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/C7.mp3",
                fingering: [20, 21, 22]
            }
        },
        76: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/C7di.mp3",
                fingering: [9, 20, 21, 22]
            }
        },
        77: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/D7.mp3",
                fingering: [9, 19, 20, 21, 22]
            }
        },
        78: {
            alto: {
                audio: "audio/visual-instruments/saxophone/alto/D7di.mp3",
                fingering: [6, 19, 20, 21, 2]
            }
        }
    }
    , instrumentTypeSwitch = document.querySelector(".js-type-switch")
    , instrumentImage = $("#instrument-image");
$(instrumentImage).on("instrument.loaded", function () {
    var t = Object.keys(NOTES);
    playNote(null, getFingeringChartByNoteNumber(_slicedToArray(t, 1)[0], getSubInstrument())),
        instrument.loader.hide()
});
var instrument = new Saxophone(instrumentImage, window.cdnDomain)
    , audios = []
    , currentPlayingAudioNumber = null
    , $stuffNotes = $('div[class*="instrument-button-"]');
$stuffNotes.on("click", function () {
    stopCurrentPlayingNote(),
        $stuffNotes.removeClass("active"),
        $(this).addClass("active");
    var t = getSubInstrument()
        , i = getNoteNumberByClassAttr($(this).attr("class"))
        , n = getFingeringChartByNoteNumber(i, t)
        , e = function () {
            instrument.hideLoader(),
                this.paused && playNote(this, n)
        }
        , a = getNoteAudio(i, e);
    setCurrentPlayingAudio(i),
        a.readyState > 2 ? playNote(a, n) : (setTimeout(function () {
            4 !== a.readyState && instrument.showLoader()
        }, 150),
            a.addEventListener("canplaythrough", function () {
                instrument.hideLoader(),
                    this.paused && playNote(this, n)
            }))
}),
    window.width = $(window).width(),
    $(window).on("resize", function () {
        window.width !== $(window).width() && (instrument.clearAll(),
            $stuffNotes.removeClass("active"),
            window.width = $(window).width())
    });
