$(function($) {

    var ROUTES_BY_STOP_NAME_ENDPOINT = 'https://api.appglu.com/v1/queries/findRoutesByStopName/run',
        STOPS_BY_ROUTE_ID_ENDPOINT = 'https://api.appglu.com/v1/queries/findStopsByRouteId/run',
        DEPARTURES_BY_ROUTE_ID_ENDPOINT = 'https://api.appglu.com/v1/queries/findDeparturesByRouteId/run',
        USERNAME = 'WKD4N7YMA1uiM8V',
        PASSWORD = 'DtdTtzMLQlA0hk2C1Yi5pLyVIlAQ68',
        DEFAULT_AJAX_OPTIONS = {
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            headers: {
                'X-AppGlu-Environment': 'staging',
                // about JS's `btoa` function:
                // - https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa
                // - http://caniuse.com/#feat=atob-btoa
                'Authorization': "Basic " + btoa(USERNAME + ":" + PASSWORD)
            },
        },
        emptyFunc = function() {},
        EXECUTE_AJAX_REQUEST_DEFAULT_ARGUMENTS = {
            beforeStart: emptyFunc
        };

    /**
     * Performs AJAX HTTP request using jQuery' $.ajax options defined in `ajaxOptions`
     * and custom behaviors defined in `args`.
     *
     * Defaults ajax options are defines in `DEFAULT_AJAX_OPTIONS` and default arguments
     * are defined in `EXECUTE_AJAX_REQUEST_DEFAULT_ARGUMENTS`.
     */
    function _executeAjaxRequest(args, ajaxOptions) {

        args = $.extend({}, EXECUTE_AJAX_REQUEST_DEFAULT_ARGUMENTS, args);
        var beforeStart = args.beforeStart;

        var options = $.extend({}, DEFAULT_AJAX_OPTIONS, ajaxOptions);

        beforeStart();
        return $.ajax(options);
    };

    function searchStopsByRouteId(routeId, args) {

        var ajaxOptions = {
            url: STOPS_BY_ROUTE_ID_ENDPOINT,
            data: JSON.stringify({
                params: {
                    routeId: routeId
                }
            })
        };
        return _executeAjaxRequest(args, ajaxOptions);
    };

    function searchDeparturesByRouteId(routeId, args) {

        var ajaxOptions = {
            url: DEPARTURES_BY_ROUTE_ID_ENDPOINT,
            data: JSON.stringify({
                  params: {
                      routeId: routeId
                }
            })
        };
        return _executeAjaxRequest(args, ajaxOptions);
    };

    function renderStops(stops) {

        var $panel = $('.stops-panel').empty();
        if (stops && stops.length) {

            // ensure stops are sorted by its sequence attribute
            stops.sort(function(stop1, stop2) {
                return (stop1.sequence - stop2.sequence);
            });

            var template = $('#stops-tmpl').html();
            Mustache.parse(template);
            var rendered = Mustache.render(template, {stops: stops});
            $panel.append(rendered);
        }
    };

    function renderDepartures(departures) {

        var $panel =  $('.departures-panel').empty();
        if (departures && departures.length) {

            var groupBy = function(xs, key) {
              return xs.reduce(function(rv, x) {
                (rv[x[key]] = rv[x[key]] || []).push(x);
                return rv;
              }, {});
            };

            // typeOfDay == 'WEEKDAY' | 'SATURDAY' \ 'SUNDAY'
            var departuresByTypeOfDay = groupBy(departures, 'calendar');

            var template = $('#departures-tmpl').html();
            Mustache.parse(template);
            var rendered = Mustache.render(template, departuresByTypeOfDay);
            $panel.append(rendered);
        }
    };

    function showDetailView(route) {
        var id = route.id,
            name = route.name;

        $('.list-view').addClass('hide');
        $('.detail-view').removeClass('hide');

        $('.route-name-label').text(name);

        var setLoadingState = function() {
            $('.detail-view').addClass('loading');
        };
        var removeLoadingState = function() {
            $('.detail-view').removeClass('loading');
        };

        var stopsPromise = searchStopsByRouteId(id, {
            beforeStart: setLoadingState
        });
        var departuresPromise = searchDeparturesByRouteId(id, {
            beforeStart: setLoadingState
        });

        $.when(stopsPromise, departuresPromise)
            .done(function(stopsResult, departuresResult) {
                // stopResults object format example:
                // `[{"rows":[{"id":15,"calendar":"WEEKDAY","time":"05:50"}],"rowsAffected":0}, 'statusText', jqXHR]`
                var stops = stopsResult[0].rows;
                // departuresResult object format example:
                // `[{"rows":[{"id":1,"name":"TICEN","sequence":1,"route_id":35}],"rowsAffected":0}, 'statusText', jqXHR]`
                var departures = departuresResult[0].rows;

                renderStops(stops);
                renderDepartures(departures);
            })
            .always(removeLoadingState);
    };

    function backToListView() {
        $('.list-view').removeClass('hide');
        $('.detail-view').addClass('hide');
        renderDepartures([]);
        renderStops([]);
    };

    /**
     * Example of result:
     * @param routes JSON object following structure:
     *   `{"id":22,"shortName":"131","longName":"AGRONÔMICA VIA GAMA D'EÇA","lastModifiedDate":"2009-10-26T02:00:00+0000","agencyId":9}`
     */
    function renderRoutes(routes) {
        var template = $('#routes-result-tmpl').html();
        Mustache.parse(template);
        var rendered = Mustache.render(template, {
            routes: routes,
            empty: routes.length == 0
        });

        $('.routes-panel')
            .empty()
            .append(rendered);
    };

    function searchRoutesByStopName(name, args) {

        var ajaxOptions = {
            url: ROUTES_BY_STOP_NAME_ENDPOINT,
            data: JSON.stringify({
                params: {
                    stopName: name
                }
            })
        };
        var promise = _executeAjaxRequest(args, ajaxOptions)
            .done(function(data, textStatus, jqXHR) {
                // Example of returned data format:
                // {"rows": [{"id":22,"shortName":"131","longName":"AGRONÔMICA VIA GAMA D'EÇA","lastModifiedDate":"2009-10-26T02:00:00+0000","agencyId":9}], "rowsAffected":0}
                var rows = data.rows;
                renderRoutes(rows);
            });

        return promise;
    };

    function init() {
        var $routeSearchForm = $('form.route-search-form');

        $routeSearchForm.submit(function(e) {

            e.preventDefault();
            var $location = $('[name="location"]', $routeSearchForm),
                location = $location.val().trim();

            if (!location) {
                $routeSearchForm.prepend($('#no-input-error-tmpl').html());
            } else {
                var promise = searchRoutesByStopName('%' + location + '%', {
                    beforeStart: function() {
                        $routeSearchForm.addClass('loading');
                    }
                });

                promise.always(function() {
                    $routeSearchForm.removeClass('loading');
                });
            }
        });

        $('.detail-view .back-trigger').click(function() {
            backToListView();
        });

        $('.routes-panel').on('click', '[data-route-id]', function() {

            var routeId = $(this).data('route-id'),
                routeName = $(this).data('route-name');

            showDetailView({id: routeId, name: routeName});
        });
    };

    init();
});