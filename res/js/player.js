const electron = require('electron');
const ipc = electron.ipcRenderer;
const fs = require('fs');
const mm = require('musicmetadata');

const volume_slider = $('.vol-progress');
const volume_current = $('.vol-current');
const play_header = $('.play-header');
const folder_name = $('.folder');
const progress = $('.progress');
const current = $('.current');
const current_play = $('.current-song');
const song_duration = $('.seek-duration');
const seek_pos = $('.seek-pos');
const pl_pa = $('#play');
const next = $('#next');
const prev = $('#prev')
const vol = $('#vol');
const list = $('.list');
const song_list = $('ul');


var global_volume = volume_current.width() / volume_slider.width() * 100;
var prev_vol = global_volume;
var global_loc;
var current_song;
var curren_index;
var playList = []

ipc.on('selected-folder', (event, obj) => {
    let gi = 0;
    curren_index = 0;
    folder_name.html(obj.loc.split('\\')[obj.loc.split('\\').length - 1]);
    playList = [];
    global_loc = obj.loc;
    song_list.html('');
    obj.files.forEach((file) => {
        var parser = mm(fs.createReadStream(global_loc + '\\' + file), { duration: true }, function (err, metadata) {
            if (!err) {
                playList.push({
                    index: gi,
                    song: file,
                    song_name: metadata.title || file,
                    duration: metadata.duration
                });
                song_list.append(`<li class="list">
                <span class="index">${playList[gi].index + 1}</span>
                <span class="song">${playList[gi].song_name}</span>
                <span class="duration">${toTime(playList[gi].duration)}</span>
                </li>`);
                gi++;
            }
        });
    });
});

ipc.on('update-download', (event, perc) => {
    play_header.html('Download Progress : ' + parseInt(perc) + '%');
});

volume_slider.mousedown(function (event) {
    init_global_vol(event.pageX);
    volume_slider.mousemove(function (event) {
        init_global_vol(event.pageX);
        prev_vol = global_volume;
    });
    prev_vol = global_volume;
});

progress.mousedown(function (event) {
    init_seek(event.pageX);
    progress.mousemove(function (event) {
        init_seek(event.pageX);
    });
});

$(document).mouseup(function (event) {
    volume_slider.off('mousemove');
    progress.off('mousemove');
});

vol.on('click', toggle_mute);

pl_pa.on('click', function () {
    if (current_song) {
        toggle_play();
    }
});

next.on('click', next_song);

prev.on('click', prev_song);

song_list.on('click', 'li', function (event) {
    curren_index = $(this).children().eq(0).html() - 1;
    console.log(curren_index)
    song_change();
})

function toTime(seconds) {
    var min = Math.floor(seconds / 60) || 0;
    var sec = parseInt(seconds - min * 60) || 0;
    return min + ':' + (sec < 10 ? '0' : '') + sec;
}

function song_change() {
    song_list.children().removeClass('selected');
    song_list.children().eq(curren_index).addClass('selected');
    init_play();
}

function init_global_vol(mx) {
    let rp = parseInt(volume_slider.offset().left);
    let w = parseInt(volume_slider.width());
    let rmx = mx - rp;
    global_volume = (mx - rp) / w * 100;
    volume_current.css('width', global_volume + '%');
    if (current_song) {
        current_song.volume(global_volume / 100);
    }
}

function init_seek(mx) {
    if (current_song) {
        let rp = parseInt(progress.offset().left);
        let w = parseInt(progress.width());
        let dx = current_song.duration() / w;
        let rmx = mx - rp;
        current_song.seek(dx * rmx);
        let perc = rmx / w * 100;
        current.css('width', perc + 1 + '%');
    }
}

function update_seek() {
    if (current_song) {
        seek_pos.html(toTime(current_song.seek()));
        let w = parseInt(progress.width());
        let dy = w / current_song.duration();
        current.css('width', (dy * current_song.seek() + 1));
    }
}

function change_pl_ico() {
    if (current_song.playing()) {
        pl_pa.removeClass('fa-play');
        pl_pa.addClass('fa-pause');

    } else {
        pl_pa.removeClass('fa-pause');
        pl_pa.addClass('fa-play');
    }
}

function init_play() {
    if (current_song) {
        current_song.stop();
        change_pl_ico();
    }
    current_song = new Howl({
        src: [global_loc + '\\' + playList[curren_index].song],
        volume: global_volume / 100,
        onend: next_song,
        onload: function () {
            current_play.html(playList[curren_index].song_name);
            song_duration.html(toTime(playList[curren_index].duration));
            toggle_play();
        }
    });

}

function toggle_mute() {
    if (current_song) {
        if (current_song.volume() == 0) {
            console.log('zero');
            let rp = parseInt(volume_slider.offset().left);
            let w = parseInt(volume_slider.width());
            init_global_vol((prev_vol * w / 100) + rp);
            vol.removeClass('fa-volume-off');
            vol.addClass('fa-volume-up');
        } else {
            console.log('Not Zero');
            prev_vol = global_volume;
            init_global_vol(parseInt(volume_slider.offset().left));
            vol.removeClass('fa-volume-up');
            vol.addClass('fa-volume-off');
        }
        volume_current.css('width', global_volume + '%');
    }
}

function toggle_play() {
    if (current_song.playing()) {
        current_song.pause();
    } else {
        current_song.play();
    }
    change_pl_ico();
}

function next_song() {
    if (curren_index == playList.length - 1) {
        curren_index = 0
    } else {
        curren_index++;
    }
    song_change();
}

function prev_song() {
    if (curren_index == 0) {
        curren_index = playList.length - 1;
    } else {
        curren_index--;
    }
    song_change();
}

setInterval(update_seek, 10);