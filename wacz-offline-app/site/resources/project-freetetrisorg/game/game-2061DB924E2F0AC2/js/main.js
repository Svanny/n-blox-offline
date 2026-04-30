var isIFrame = window.frameElement && (window.frameElement.nodeName == "IFRAME");
if (!isIFrame) {
	window.location.replace(window.location.protocol + "//" + window.location.hostname);
} else {
	var pageStartTimeMSEC = Date.now();
	var cbidg = "2061DB924E2F0AC2";
	var gameDiv = document.getElementById("GameDiv");
	var gameCanvas = document.getElementById("GameCanvas");

	//----------------------------------------------------------------

	window.axGAFGHTML_didOnReadyTimeout = false;
	onReadyElapsedTimeSEC = 0;
	var onReadyTimeoutInterval = setInterval(function () {
		onReadyElapsedTimeSEC++;
		var onReadyTimeoutLimitSEC = 5;
		var isReady = ((onReadyElapsedTimeSEC > onReadyTimeoutLimitSEC) && window.mBPSApp);
		if (isReady) {
			clearInterval(onReadyTimeoutInterval);
			axGAFGHTML5_onReadyTimeout();
		}
	}, 1000);

	window.adsbygoogle = [];
	var adBreak = function (o) {
		if (o && typeof o.adBreakDone == "function") {
			setTimeout(function () { o.adBreakDone({ breakStatus: "offline" }); }, 0);
		}
	};
	var adConfig = function (o) {
		if (o && typeof o.onReady == "function") {
			setTimeout(o.onReady, 0);
		}
	};
	adConfig({
		preloadAdBreaks: 'on',
		onReady: () => {
			clearInterval(onReadyTimeoutInterval);
			if (!window.axGAFGHTML_didOnReadyTimeout) {
				showGameAreaAd('preroll');
			}
		}
	});

	//----------------------------------------------------------------

	function openURL(pURL, pTargetNewWindow) { try { window.parent.open(pURL, pTargetNewWindow ? "_blank" : "_self"); } catch (e) { } }

	function getPageElapsedTimeMSEC() { return isIFrame ? window.parent.getPageElapsedTimeMSEC() : ((Date.now() - pageStartTimeMSEC)); }

	function TGREAIGRIMZPFHREXNXJUMGJNGRPCNDK() { return 0; } //isIFrame ? window.parent.TGREAIGRIMZPFHREXNXJUMGJNGRPCNDK() : 0; }

	function PCDFCJSRUMBRFNRKJOJKWNSJNMNFONFLPFTKYSBKDT() { return 0; }//isIFrame ? window.parent.PCDFCJSRUMBRFNRKJOJKWNSJNMNFONFLPFTKYSBKDT() : 0; }

	function getCBID() { return cbidg; }

	function getGameDiv() {
		if (gameDiv == null)
		{
			gameDiv = document.getElementById("GameDiv");
		}
		return gameDiv;
	}

	function getGameCanvas() {
		if (gameCanvas == null)
		{
			gameCanvas = document.getElementById("GameCanvas");
		}
		return gameCanvas;
	}

	function getCurrentYear() { return new Date().getFullYear(); }

	function gameLoadingSceneIsReady() { try { removeLoadingDisplay(); } catch (e) { } }

	function removeLoadingDisplay() {
		var loadingText = document.getElementById('loadingText');
		if (loadingText) { loadingText.parentNode.removeChild(loadingText); }
		var loadingDisplay = document.getElementById('loadingDisplay');
		if (loadingDisplay) { loadingDisplay.parentNode.removeChild(loadingDisplay); }
	}

	function trackGA4PageEvent(pEventName, pParameters) { if (isIFrame) { try { window.parent.trackGA4PageEvent(pEventName, pParameters); } catch (e) { } } }
	function trackGA4GameEvent(pEventName, pParameters) { if (isIFrame) { try { window.parent.trackGA4GameEvent(pEventName, pParameters); } catch (e) { } } }

	function refreshAds() { if (isIFrame) { window.parent.refreshAds(); } }

	function isGameAreaAdEnabled() { return isIFrame ? window.parent.canShowAds : false; }

	function isGameAreaAdActive() { return isIFrame ? window.parent.isGameAreaAdActive : false; }

	var adBreakTimeoutId = null;

	function showGameAreaAd(pType = 'next') {
		try {
			switch (pType) {
				case 'preroll':
					adBreak({
						type: pType,
						name: 'AD_NAME',
						adBreakDone: axGAFGHTML5_axBreakDone
					});
					break;
				case 'next':
				default:
					window.parent.showGameAreaAd();
					adBreakTimeoutId = setTimeout(function() {
						axGAFGHTML5_axBreakDone({ breakStatus: 'timeout' });
					}, 5000);
					adBreak({
						type: pType,
						name: 'AD_NAME',
						beforeAd: axGAFGHTML5_beforeAx,
						afterAd: axGAFGHTML5_afterAx,
						adBreakDone: axGAFGHTML5_axBreakDone
					});
					break;
			}
		} catch (e) { }
	}

	function onGameAreaAdComplete() {
		var onGameAreaAdCompleteInterval = setInterval(function () {
			try {
				if (window.mBPSApp) {
					clearInterval(onGameAreaAdCompleteInterval);
					window.parent.document.activeElement.blur();
					window.parent.document.getElementById("gameIFrame").focus();
					document.activeElement.blur();
					document.getElementById("GameCanvas").focus();
					window.mBPSApp.dispatchAppMessage(979287055);
				}
			} catch (e) { }
		}, 100);
	}

	//----------------------------------------------------------------
	//-- GAFGHTML5:

	function axGAFGHTML5_beforeAx() { }

	function axGAFGHTML5_afterAx() { }

	function axGAFGHTML5_axBreakDone(pPlacementInfo) {
		if (adBreakTimeoutId) {
			clearTimeout(adBreakTimeoutId);
			adBreakTimeoutId = null;
		}
		switch (pPlacementInfo.breakStatus) {
			case "timeout":
				trackGA4PageEvent("ads_google_h5__system_timeout", {});
				break;

			case "dismissed":
				trackGA4PageEvent("ads_google_h5__ad_skipped", {});
				break;

			case "viewed":
				trackGA4PageEvent("ads_google_h5__ad_complete", {});
				break;

			default:
				trackGA4PageEvent("ads_google_h5__no_ad_delivered", {});
				break;
		}
		window.parent.onGameAreaAdComplete();
	}

	function axGAFGHTML5_onReadyTimeout() {
		trackGA4PageEvent("ads_google_h5__system_timeout", {});
		axGAFGHTML_didOnReadyTimeout = true;
		window.parent.onGameAreaAdFailed();
	}

	//----------------------------------------------------------------

}
