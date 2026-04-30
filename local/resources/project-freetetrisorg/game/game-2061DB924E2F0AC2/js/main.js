var isIFrame = window.frameElement && window.frameElement.nodeName === "IFRAME";
var pageStartTimeMSEC = Date.now();
var cbidg = "2061DB924E2F0AC2";
var gameDiv = document.getElementById("GameDiv");
var gameCanvas = document.getElementById("GameCanvas");

function safeParentCall(methodName, fallbackValue) {
    try {
        if (isIFrame && window.parent && typeof window.parent[methodName] === "function") {
            return window.parent[methodName].apply(window.parent, Array.prototype.slice.call(arguments, 2));
        }
    } catch (e) {}
    return fallbackValue;
}

function openURL(pURL, pTargetNewWindow) {
    var target = pTargetNewWindow ? "_blank" : "_self";
    try {
        if (isIFrame && window.parent && typeof window.parent.open === "function") {
            window.parent.open(pURL, target);
            return;
        }
    } catch (e) {}
    window.open(pURL, target);
}

function getPageElapsedTimeMSEC() {
    return safeParentCall("getPageElapsedTimeMSEC", Date.now() - pageStartTimeMSEC);
}

function TGREAIGRIMZPFHREXNXJUMGJNGRPCNDK() {
    return safeParentCall("TGREAIGRIMZPFHREXNXJUMGJNGRPCNDK", 0);
}

function PCDFCJSRUMBRFNRKJOJKWNSJNMNFONFLPFTKYSBKDT() {
    return safeParentCall("PCDFCJSRUMBRFNRKJOJKWNSJNMNFONFLPFTKYSBKDT", 0);
}

function getCBID() {
    return cbidg;
}

function getGameDiv() {
    if (gameDiv == null) {
        gameDiv = document.getElementById("GameDiv");
    }
    return gameDiv;
}

function getGameCanvas() {
    if (gameCanvas == null) {
        gameCanvas = document.getElementById("GameCanvas");
    }
    return gameCanvas;
}

function getCurrentYear() {
    return new Date().getFullYear();
}

function gameLoadingSceneIsReady() {
    removeLoadingDisplay();
}

function removeLoadingDisplay() {
    var loadingText = document.getElementById("loadingText");
    if (loadingText) {
        loadingText.parentNode.removeChild(loadingText);
    }
    var loadingDisplay = document.getElementById("loadingDisplay");
    if (loadingDisplay) {
        loadingDisplay.parentNode.removeChild(loadingDisplay);
    }
}

function trackGA4PageEvent() {}

function trackGA4GameEvent() {}

function refreshAds() {}

function isGameAreaAdEnabled() {
    return false;
}

function isGameAreaAdActive() {
    return false;
}

function focusCanvas() {
    try {
        if (isIFrame && window.parent && window.parent.document.activeElement) {
            window.parent.document.activeElement.blur();
        }
    } catch (e) {}
    try {
        document.activeElement.blur();
    } catch (e) {}
    try {
        getGameCanvas().focus();
    } catch (e) {}
}

function onGameAreaAdComplete() {
    var onGameAreaAdCompleteInterval = setInterval(function() {
        try {
            if (window.mBPSApp) {
                clearInterval(onGameAreaAdCompleteInterval);
                focusCanvas();
                removeLoadingDisplay();
                window.mBPSApp.dispatchAppMessage(979287055);
                if (typeof window.mBPSApp.onAppActivated === "function") {
                    window.mBPSApp.onAppActivated();
                }
                var unlockAttempts = 0;
                var unlockInterval = setInterval(function() {
                    try {
                        if (!window.mBPSApp || unlockAttempts >= 20) {
                            clearInterval(unlockInterval);
                            return;
                        }
                        window.mBPSApp.dispatchAppMessage(979287055);
                        unlockAttempts++;
                    } catch (e) {
                        clearInterval(unlockInterval);
                    }
                }, 250);
            }
        } catch (e) {}
    }, 100);
}

function showGameAreaAd() {
    setTimeout(onGameAreaAdComplete, 0);
}

function axGAFGHTML5_beforeAx() {}

function axGAFGHTML5_afterAx() {}

function axGAFGHTML5_axBreakDone() {
    onGameAreaAdComplete();
}

function axGAFGHTML5_onReadyTimeout() {
    onGameAreaAdComplete();
}

// The archived site gated startup behind an ad/iframe contract. For local use
// we skip that handshake and start the game immediately.
window.addEventListener("load", function() {
    showGameAreaAd("preroll");
});
