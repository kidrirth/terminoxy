$(function() {
    let timer = null;
    let isPaused = false;
    let secondsSinceLastLetter = 0;
    let isPunishmentInPlace = false;
    let wordDeletionTimer = null;

    const emojisSet = [
       '🐶','🐱','🐹','🐼','🐮','🐷','🐸',
    ];

    const settings = {
        defaultPeriodTime: 30,
        defaultPauseTime: 10,
    };

    const minutesRangeInput = $('#minutesRange');
    const minutesRangeLabel = minutesRangeInput.parent().find('label');
    const pauseRangeInput = $('#pauseRange');
    const pauseRangeLabel = pauseRangeInput.parent().find('label');

    const settingsForms = $('#appSettings');
    const startButton = $('#appStart');
    const restoreButton = $('#appRestore');
    const finishButton = $('#appFinish');
    const pauseButton = $('#appPause');
    const continueButton = $('#appContinue');
    
    const exportButton = $('#textExport');
    const copyButton = $('#textCopy');

    const userText = $('#userText');
    const userTextRestoreCopy = $('#textRestoreCopy');
    const audioWarning = $('#audioWarning');

    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    function destroyClickedElement(event) {
        document.body.removeChild(event.target);
    }

    const initApp = () => {
        minutesRangeInput.slider({
            range: "min",
            value: 10,
            step: 5,
            min: 5,
            max: 100,
            
            slide: function (event, ui) {
                minutesRangeLabel.html(`Время работы: ${ui.value} минут`);
            }
        });
        pauseRangeInput.slider({
            range: "min",
            value: 15,
            step: 5,
            min: 5,
            min: 5,
            max: 45,
            
            slide: function (event, ui) {
                pauseRangeLabel.html(`Время допустимой паузы: ${ui.value} секунд`);
            }
        });

        minutesRangeInput.slider("value", settings.defaultPeriodTime);
        minutesRangeLabel.html(`Время работы: ${settings.defaultPeriodTime} минут`);
        pauseRangeInput.slider("value", settings.defaultPauseTime);
        pauseRangeLabel.html(`Время допустимой паузы: ${settings.defaultPauseTime} секунд`);
        finishButton.hide();
        userText.prop('disabled', true);
    }

    const registerInputHandlers = () => {
        exportButton.click(function (e) { 
            e.preventDefault();
            const textToWrite = userText.val();
            const textFileAsBlob = new Blob([textToWrite], { type: 'text/plain' });
            const currentDate = new Date().toLocaleString();
            const fileNameToSaveAs = `super-text ${currentDate}.txt`;
    
            let downloadLink = document.createElement("a");
            downloadLink.download = fileNameToSaveAs;
            downloadLink.innerHTML = "";
            window.URL = window.URL || window.webkitURL;
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
            downloadLink.onclick = destroyClickedElement;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
            downloadLink.click();
    
            exportButton.notify("Экспортировано", "success");
        });
    
        copyButton.click(function (e) { 
            e.preventDefault();
            userText.prop("disabled", false);
            userText.select();
            document.execCommand('copy');
            userText.prop("disabled", true);
            copyButton.notify("Скопировано, лучше куда-нибудь сразу вставь!", "success");
        });

        finishButton.click(function (e) { 
            e.preventDefault();
            stopApp();
        });
    
        startButton.click(function (e) { 
            e.preventDefault();
            startApp();
        });

        continueButton.click(function (e) { 
            e.preventDefault();
            continueButton.hide();
            // pauseButton.show(); // use pause only once per session
            userText.prop('disabled', false);
            isPaused = false;
        });

        pauseButton.click(function (e) { 
            e.preventDefault();
            pauseButton.hide();
            continueButton.show();
            userText.prop('disabled', true);
            isPaused = true;
        });

        restoreButton.click(function (e) { 
            e.preventDefault();
            userText.val(userTextRestoreCopy.val());
            userTextRestoreCopy.val('');
            restoreButton.hide();
        });

        userText.on("change keyup paste", function() {
            secondsSinceLastLetter = 0;
            restoreButton.hide();
            stopPunishment();
        });
    }

    initApp();
    registerInputHandlers();


    const uiOnAppStop = () => {
        $("#appSettings :input").prop("disabled", false);
        minutesRangeInput.slider("enable");
        pauseRangeInput.slider("enable");
        finishButton.hide();
        pauseButton.hide();
        continueButton.hide();
        startButton.show();
        userText.prop('disabled', true);
        restoreButton.hide();
    }

    const uiOnAppStart = () => {
        $("#appSettings :input").prop("disabled", true);
        minutesRangeInput.slider("disable");
        pauseRangeInput.slider("disable");
        startButton.hide();
        finishButton.show();
        pauseButton.show();
        pauseButton.prop("disabled", false);
        continueButton.prop("disabled", false);
        finishButton.prop("disabled", false);
        exportButton.prop("disabled", false);
        copyButton.prop("disabled", false);
        restoreButton.prop("disabled", false);
        userText.val('');
        userText.prop('disabled', false);

        if (userTextRestoreCopy.val()) {
            restoreButton.show();
        }
    }

    const startCountdown = () => {
        stopCountdown();
        let countDownTime = new Date().getTime() + minutesRangeInput.slider('value') * 60 * 1000;
        timer = setInterval(function() {
            console.log(countDownTime);
            if (isPaused) {
                countDownTime += 1 * 1000;
                return;
            }
            const distance = countDownTime - new Date().getTime();

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          

            $('#countdown').html(`${hours}h ${minutes}m ${seconds}s`);
            if (distance < 0) {
                stopApp();
                $('#countdown').html('Время вышло');
            }
          }, 1000);
    }

    const stopCountdown = () => {
        if (timer) {
            clearInterval(timer);
        }
        timer = null;
    }

    const stopApp = () => {
        uiOnAppStop();
        stopCountdown();
        stopPunishment();
        userTextRestoreCopy.val(userText.val());
        console.log('data in copy:', userTextRestoreCopy.val());
    } 

    const startPunishment = (appMode) => {
        userText.css("border-color", "red");
        switch(appMode) {
            case 'warning':
                $(audioWarning)[0].play();
                break;
            case 'suicide':
                if (!userText.val().length || wordDeletionTimer || !timer) {
                    return;
                }
                wordDeletionTimer = setInterval(function() {
                    if (isPaused) {
                        return;
                    }
                    let text = userText.val();
                    const kamikazeSymbolIndex = getRandomInt(text.length - 2);
                    const emoji =  emojisSet[getRandomInt(emojisSet.length - 1)]
                    
                    const runes = Array.from(text);
                    runes[kamikazeSymbolIndex] = emoji;

                    // text = text.substring(0, kamikazeSymbolIndex) + emoji + text.substring(kamikazeSymbolIndex + 1);
                    // userText.val(text);
                    userText.val(runes.join(""));
                }, 1000);
                break;
            default:
                console.log('what the fu...');
                break;
        }
        isPunishmentInPlace = true;
    }

    const stopPunishment = () => {
        userText.css("border-color", "white");
        if (wordDeletionTimer) {
            clearInterval(wordDeletionTimer);
            wordDeletionTimer = null;
        }
        $(audioWarning)[0].pause();
        isPunishmentInPlace = false;
    }

    const handleTyping = (appMode) => {
        const typingTimer = setInterval(function() {
            if (isPaused) {
                return;
            }
            if (secondsSinceLastLetter > pauseRangeInput.slider('value') - 1) {
                startPunishment(appMode);
            }

            secondsSinceLastLetter++;

            if (!timer) {
                clearInterval(typingTimer);
            }
        }, 1000);
    }

    const startApp = () => {
        timer = null;
        isPaused = false;
        secondsSinceLastLetter = 0;
        isPunishmentInPlace = false;
        wordDeletionTimer = null;

        uiOnAppStart();
        
        const appMode = $('#appSettings input[name="appMode"]:checked').val();
        startCountdown();
        handleTyping(appMode);
    }

    
});