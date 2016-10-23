$(function (window, $, ko, undefined) {

	var groupURL = 'http://www.meetup.com/NoVAGeekClub';

	var memberRSVPVM = ko.mapping.fromJS({ rsvps: [] });

	var icons = [
			{
				labels: ['TARDIS','Doctor Who','The Doctor'],
				icon: 'images/events/tuesday.png'
			},
			{
				labels: ['Board Games Night','Board & Social','Game Night'],
				icon: 'images/events/friday.gif'
			},
			{
				labels: ['Orchestra'],
				icon: 'images/orchestra.png'
			},
			{
				labels: ['Nerf'],
				icon: 'images/events/nerf.jpg'
			},
			{
				labels: ['Rifftrax'],
				icon: 'images/events/rifftrax.jpg'
			},
			{
				labels: ['Thriller'],
				icon: 'images/events/thriller.jpg'
			},
			{
				labels: ['Geek Girl','Geek-Girl'],
				icon: 'images/whovian-girl.jpg'
			},
			{
				labels: ['Heidirama'],
				icon: 'images/dominion.jpg'
			},
			{
				labels: ['Serenity','Firefly'],
				icon: 'images/serenity.jpg'
			},
			{
				labels: ['LEGO','Playdate','Kids'],
				icon: 'images/playdate.jpg'
			},
			{
				labels: ['Sex','Burlesque','Adult'],
				icon: 'images/sexy.jpg'
			},
			{
				labels: ['Graphic Novel','Comics','Comic'],
				icon: 'images/events/comics.jpg'
			},
			{
				labels: ['Movie'],
				icon: 'images/events/movies.jpg'
			},
			{
				labels: ['TV'],
				icon: 'images/events/tv.jpg'
			},
			{
				labels: ['Game of Thrones'],
				icon: 'images/events/game-of-thrones.jpg'
			}/* ,
			{
				labels: ['.*'],
				icon: 'images/8bitglasses.jpg'
			} */
		],
		iconMap = { default: 'images/8bitglasses.jpg' },
		scratch = [],
		labelRE;

	icons.map(function (icon) {
		scratch.push(icon.labels.join('|'));
		icon.labels.map(function (label) {
			iconMap[label] = icon.icon;
		});
	});

	labelRE = new RegExp('(' + scratch.join('|') + ')', 'gim');

	function chooseIcon (str, re, iconMap) {
		var matches = str.match(re);

		// console.log(re);

		// console.log(str + '\n'
		// 	+ (matches && matches.length) + '\n'
		// 	+ (matches && matches.length > 0 && matches[1]) + '\n'
		// 	+ (matches && matches.length > 0 ? iconMap[matches[0]] : '')
		// );

		return matches && matches.length > 0 ? iconMap[matches[0]] : iconMap.default;
	}

	function crossClubFilter(event) {
		return event.event_url.indexOf(groupURL) != -1 || (event.event_url.indexOf(groupURL) == -1 && event.description.indexOf(groupURL) == -1);
	}

	function rsvp(response, eventId) {
		$.ajax({
			url: '//api.meetup.com/2/rsvp',
			type: 'post',
			data: {
				rsvp: response,
				event_id: eventId
			},
			contentType: 'application/json',
			dataType: 'json',
			success: function (response, status, xhr) {
				// debugger;
			}
		});
	}

	function rsvpMaker(response, eventId) {
		return function () {
			rsvp(response, eventId);
		};
	}

	function processVisitors (response, status, xhr) {
		var visitors = [];

		response.results.forEach(function (item) {
			visitors.push({
				name: item.name,
				photo: item.photo ? item.photo.photo_link ? item.photo.photo_link : item.photo.thumb_link : '/images/nophoto.jpg',
				link: item.link,
				location: item.city + ', ' + item.state
			});
		});

		return visitors;
	}

	function processPhotos (response, status, xhr) {
		var photos = [];

		response.results.forEach(function (item) {
			photos.push({
				title: item.caption,
				photo: item.thumb_link,
				large: item.photo_link,
				link: item.site_link
			});
		});

		return photos;
	}

	function processPhotoAlbums (response, status, xhr) {
		var photos = [];

		response.results.forEach(function (item) {
			if (item.album_photo && item.album_photo.thumb_link) {
				photos.push({
					title: item.title,
					photo: item.album_photo.thumb_link,
					large: item.album_photo.photo_link,
					larger: item.album_photo.hires_link,
					link: groupURL + '/photos/' + item.photo_album_id
				});
			}
		});

		return photos;
	}

	function processEvents (response, status, xhr) {

		var events = this,
			days = [],
			currentDay = null,
			currentHeading = null,
			currentRSVPHeading = null,
			current = null,
			event;

		if ( ! ( response && response.results ) ) {
			return days;
		}

		response
			.results
			.filter(crossClubFilter)
			.forEach(function (item) {
			var eventTime = moment(item.time),
				where = item.venue ? (item.venue.name + ' (' + item.venue.address_1 + ' ' + item.venue.city + ', ' + item.venue.state + ' ' + item.venue.zip + ')') : 'TBD',
				title = item.name,
				subtitle = /:|@| in /.test(title) ? title.split(/:|@| in /) : null,
				link = item.event_url,
				eventId = link.replace(/.*\/events\/([0-9]*)\//i, '$1'),
				rsvp = (item.self && ((item.self.rsvp && item.self.rsvp.response) || 'none')) || '';

			if (subtitle && subtitle.length > 1) {
				title = subtitle[0];
				subtitle = subtitle.slice(1).join(' ');
			}

			if (currentDay === null || currentDay != eventTime.format('YYYY-MM-DD')) {
				days.push(current = {
					heading: events.heading != currentHeading ? events.heading : false,
					timestamp: moment(eventTime.format('YYYY-MM-DD')).valueOf(),
					time: eventTime,
					day: moment(eventTime.format('YYYY-MM-DD')),
					dayofweek: eventTime.format('dddd'),
					dayheading: eventTime.format('ddd MM/DD'),
					events: []
				});
				currentDay = eventTime.format('YYYY-MM-DD');
				currentHeading = events.heading;
			}
			event = {
				heading: false,
				title: title,
				subtitle: subtitle,
				date: { day: current.day, dayofweek: current.dayofweek, dayheading: current.dayheading },
				when: { start: eventTime.format('h:mmA') },
				where: { description: where, address: item.venue || { 'name': 'TBD' } },
				link: link,
				id: eventId,
				member: {
					rsvp: rsvp
				},
				rsvpFunc: rsvpMaker('yes', eventId),
				content: item.description.split('</p>',3)[0].substr(3) + ' &hellip;',
				icon: chooseIcon(item.name, labelRE, iconMap),
				responses: {
					comments: item.comment_count,
					yes: item.yes_rsvp_count,
					no: item.no_rsvp_count,
					maybe: item.maybe_rsvp_count,
					waitlist: item.waitlist_count
				}
			};
			current.events.push(event);
			if (event.member.rsvp === 'yes' || event.member.rsvp === 'no') {
				event.heading = (events.heading != currentRSVPHeading) ? events.heading : false;
				memberRSVPVM.rsvps.push(event);
				currentRSVPHeading = events.heading;
			}
		});
		
		return days;
	}

	// bind the member's rsvps VM
	ko.applyBindings(memberRSVPVM, document.getElementById('rsvps-modal-container'));

	function MeetupData (options) {
		$.extend(
			this,
			options
		);
	}

	MeetupData.prototype = {
		ajaxOptions: {
			type: 'get',
			contentType: 'application/json',
			dataType: 'jsonp'			
		},
		process: function (response, status, xhr) {
			var context = this;

			context[context.property] = context[context.property].concat(
				context.fn(response, status, xhr)
			);
		},
		load: function () {
			var ajaxOptions = {},

				url;

			if (this.urls.length > 0) {
				
				url = this.urls.pop();
				this.heading = url.heading;

				$.extend(
					ajaxOptions,
					this.ajaxOptions,
					{
						url: url.address
					}
				);

				$.ajax(ajaxOptions)
					.done(
						this.process.bind(this)
					).done(
						this.load.bind(this)
					);

				return;
			}

			this.bind();
		},
		bind: function () {
			ko.applyBindings(
				this,
				document.getElementById(this.target)
			);
		}
	};

	// only: maybe_rsvp_count,no_rsvp_count,comment_count,waitlist_count,venue,time,duration,event_url,name,description,how_to_find_us,self
	// fields: self,yes_rsvp_count,maybe_rsvp_count,no_rsvp_count,comment_count
	var cal1week = new MeetupData({
			urls: [
			        {
				 	heading: 'Springfield',
				 	address: 'http://api.meetup.com/2/events?status=upcoming&order=time&limited_events=False&group_urlname=Geek-Club-Alexandria&format=json&page=50&desc=false&photo-host=public&offset=0&only=yes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count%2Cvenue%2Ctime%2Cduration%2Cevent_url%2Cname%2Cdescription%2Chow_to_find_us%2Cself&fields=self%2Cyes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count&time=%2C1w&sig_id=9837694&sig=fd313fcf933711be759b4154c0d22e5416fb11f0'
				 } //,
				//{
				//	heading: 'Fairfax',
				//	address: 'http://api.meetup.com/2/events?status=upcoming&order=time&limited_events=False&group_urlname=NoVAGeekClub&format=json&page=50&desc=false&photo-host=public&offset=0&only=yes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count%2Cvenue%2Ctime%2Cduration%2Cevent_url%2Cname%2Cdescription%2Chow_to_find_us%2Cself&fields=self%2Cyes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count&time=%2C1w&sig_id=9837694&sig=90997cca0c1153fb5f550b73ec46e4ed852e90c9'
				//}
			],
			fn: processEvents,
			days: [],
			property: 'days',
			target: 'cal1week'
		});
	cal1week.load();
	
	var cal2week = new MeetupData({
			urls: [
				 { heading: 'Springfield', address: 'http://api.meetup.com/2/events?status=upcoming&order=time&limited_events=False&group_urlname=Geek-Club-Alexandria&format=json&page=50&desc=false&photo-host=public&offset=0&only=yes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count%2Cvenue%2Ctime%2Cduration%2Cevent_url%2Cname%2Cdescription%2Chow_to_find_us%2Cself&fields=self%2Cyes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count&time=1w%2C3w&sig_id=9837694&sig=a18c118464a499e0b95088dbc0e1c1468794146b' },
				// { heading: 'Fairfax', address: 'http://api.meetup.com/2/events?status=upcoming&order=time&limited_events=False&group_urlname=NoVAGeekClub&format=json&page=50&desc=false&photo-host=public&offset=0&only=yes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count%2Cvenue%2Ctime%2Cduration%2Cevent_url%2Cname%2Cdescription%2Chow_to_find_us%2Cself&fields=self%2Cyes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count&time=1w%2C3w&sig_id=9837694&sig=160a1d482e01f562360d45f680e171e1c03579a6'}
			],
			fn: processEvents,
			days: [],
			property: 'days',
			target: 'cal2week'
		});
	cal2week.load();

	var cal1month = new MeetupData({
			urls: [
				 { heading: 'Springfield', address: 'http://api.meetup.com/2/events?status=upcoming&order=time&limited_events=False&group_urlname=Geek-Club-Alexandria&format=json&page=50&desc=false&photo-host=public&offset=0&only=yes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count%2Cvenue%2Ctime%2Cduration%2Cevent_url%2Cname%2Cdescription%2Chow_to_find_us%2Cself&fields=self%2Cyes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count&time=3w%2C2m&sig_id=9837694&sig=ac8f28f208f0d2d19498b8d142ea07fc14767b66' },
				// { heading: 'Fairfax', address: 'http://api.meetup.com/2/events?status=upcoming&order=time&limited_events=False&group_urlname=NoVAGeekClub&format=json&page=50&desc=false&photo-host=public&offset=0&only=yes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count%2Cvenue%2Ctime%2Cduration%2Cevent_url%2Cname%2Cdescription%2Chow_to_find_us%2Cself&fields=self%2Cyes_rsvp_count%2Cmaybe_rsvp_count%2Cno_rsvp_count%2Ccomment_count%2Cwaitlist_count&time=3w%2C2m&sig_id=9837694&sig=ff1288220f8c94f0497c7e36748a1edfb5119971' }
			],
			fn: processEvents,
			days: [],
			property: 'days',
			target: 'cal1month'
		});
	cal1month.load();

	var visitors = new MeetupData({
			urls: [
				 { heading: 'Springfield', address: 'http://api.meetup.com/2/members?group_id=1816338&order=visited&desc=true&offset=0&format=json&only=name%2Cvisited%2Cphoto%2Ccity%2Cstate%2Clat%2Clon%2Clink&page=25&sig_id=9837694&sig=ae1a18a3d3c4f8a173a861370c5625447130426f' },
				// { heading: 'Fairfax', address: 'http://api.meetup.com/2/members?group_id=15235182&order=visited&desc=true&offset=0&photo-host=public&format=json&only=name%2Cvisited%2Cphoto%2Ccity%2Cstate%2Clat%2Clon%2Clink&page=25&sig_id=9837694&sig=1ebb654de0c37b531dd97d3bdd833137b996e51e' }
			],
			fn: processVisitors,
			visitors: [],
			property: 'visitors',
			target: 'visitors'
		});
	visitors.load();

/*	
	$.ajax({
		url: 'http://api.meetup.com/2/photos?order=time&group_id=1816338&desc=true&offset=0&format=json&only=created%2Ccaption%2Cthumb_link%2Cphoto_link%2Csite_link&page=50&fields=site_link&sig_id=9837694&sig=f81bbeffd812f65e339404e417440ae6617997cf',
		type: 'get',
		contentType: 'application/json',
		dataType: 'jsonp',
		success: function (response, status, xhr) {
			ko.applyBindings({
				photos: processPhotos(response, status, xhr)
			}, document.getElementById('photos'));
		}
	});
	
*/
	var photos = new MeetupData({
			urls: [
				{ heading: 'Springfield', address: 'http://api.meetup.com/2/photo_albums?group_id=1816338&order=time&desc=desc&offset=0&format=json&only=created%2Calbum_photo%2Cphoto_album_id%2Ctitle&page=50&sig_id=9837694&sig=00258c74db6c4a160f02f18a0812ac56701f8557' },
				//{ heading: 'Fairfax', address: 'http://api.meetup.com/2/photo_albums?group_id=15235182&order=time&desc=desc&offset=0&photo-host=public&format=json&only=created%2Calbum_photo%2Cphoto_album_id%2Ctitle&page=50&sig_id=9837694&sig=10da58953f17818056bf30198743a7fdcf3d8b00' }
			],
			fn: processPhotoAlbums,
			photos: [],
			property: 'photos',
			target: 'photos'
		});
	photos.load();

	// the start of routing
	switch (document.location.hash.substr(1)) {
		case 'rsvps':
			$('#rsvps-modal-container').modal();
			break;
	}

 }(window, jQuery, ko));
