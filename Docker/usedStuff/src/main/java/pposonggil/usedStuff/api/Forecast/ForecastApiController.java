package pposonggil.usedStuff.api.Forecast;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import pposonggil.usedStuff.dto.Forecast.ForecastDto;
import pposonggil.usedStuff.dto.Route.PointInformation.PointInformationDto;
import pposonggil.usedStuff.service.Forecast.ForecastService;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ForecastApiController {
    private final ForecastService forecastService;

    /**
     * 날짜, 시간으로 기상 정보 조회
     * @param forecastDto
     * @return 날짜 시간이 일치하는 기상 정보 Dto 리스트
     */
    @GetMapping("/api/forecast/by-date-time")
    public List<ForecastDto> forecastsByDateAndTime(@RequestBody ForecastDto forecastDto) {
        return forecastService.findForecastsByTime(forecastDto);
    }

    /**
     * x, y로 기상 정보 조회
     * @param forecastDto
     * @return x, y가 일치하는 기상 정보 Dto 리스트
     */
    @GetMapping("/api/forecast/by-x-y")
    public List<ForecastDto> forecastsByXAndY(@RequestBody ForecastDto forecastDto) {
        return forecastService.findForecastsByXAndY(forecastDto);
    }

    /**
     * 위도, 경도로 기상 정보 조회
     * @param pointInformationDto
     * @return 입력한 위도, 경도의 기상 정보 Dto 리스트
     */
    @GetMapping("/api/forecast/by-lat-lon")
    public List<ForecastDto> findForecastsByLatAndLon(@RequestBody PointInformationDto pointInformationDto) {
        return forecastService.findForecastsByLatAndLon(pointInformationDto);
    }

    /**
     * 날짜, 시간, x, y가 일치하는 기상 정보 조회
     * @param forecastDto
     * @return 날짜, 시간, x, y가 일치하는 기상 정보 Dto
     */
    @GetMapping("/api/forecast/by-date-time-x-y")
    public ForecastDto forecastDtoByDateAndTimeAndXAndY(@RequestBody ForecastDto forecastDto) {
        return forecastService.findForecastByTimeAndXAndY(forecastDto);
    }

}