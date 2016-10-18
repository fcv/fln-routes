$(function($) {

    var ROUTES_BY_STOP_NAME_ENDPOINT = 'https://api.appglu.com/v1/queries/findRoutesByStopName/run',
        USERNAME = 'WKD4N7YMA1uiM8V',
        PASSWORD = 'DtdTtzMLQlA0hk2C1Yi5pLyVIlAQ68';

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

    function searchRoutesByStopName(name) {

        $.ajax({
            url: ROUTES_BY_STOP_NAME_ENDPOINT,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                params: {
                    stopName: name
                }
            }),
            headers: {
                'X-AppGlu-Environment': 'staging',
                // about JS's `btoa` function:
                // - https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa
                // - http://caniuse.com/#feat=atob-btoa
                'Authorization': "Basic " + btoa(USERNAME + ":" + PASSWORD)
            },
            success: function(data, textStatus, jqXHR) {

                // Example of returned data format:
                // {"rows": [{"id":22,"shortName":"131","longName":"AGRONÔMICA VIA GAMA D'EÇA","lastModifiedDate":"2009-10-26T02:00:00+0000","agencyId":9}], "rowsAffected":0}
                var rows = data.rows;
                renderRoutes(rows);
            }
        });
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
                searchRoutesByStopName('%' + location + '%');
            }
        });
    };

    init();
});
