package pposonggil.usedStuff.service.Route;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.maps.internal.PolylineEncoding;
import com.google.maps.model.LatLng;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pposonggil.usedStuff.dto.Forecast.ForecastDto;
import pposonggil.usedStuff.dto.Route.Path.PathDto;
import pposonggil.usedStuff.dto.Route.Point.PointDto;
import pposonggil.usedStuff.dto.Route.PointInformation.PointInformationDto;
import pposonggil.usedStuff.dto.Route.SubPath.SubPathDto;
import pposonggil.usedStuff.repository.route.path.PathRepository;
import pposonggil.usedStuff.repository.route.subpath.SubPathRepository;
import pposonggil.usedStuff.service.Forecast.ForecastService;


import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SubPathService {
    private final PathRepository pathRepository;
    private final SubPathRepository subPathRepository;
    private final ForecastService forecastService;

    /**
     * default osrm 도보 경로
     *
     * @param pathDto: 경로 Dto
     * @return 최적 도보 경로가 포함된 경로
     * @throws IOException
     */
    public List<SubPathDto> createDefaultSubPaths(PathDto pathDto) throws IOException {
        List<SubPathDto> subPathDtos = pathDto.getSubPathDtos();

        List<SubPathDto> result = new ArrayList<>();
        ObjectMapper objectMapper = new ObjectMapper();

        for (SubPathDto subPathDto : subPathDtos) {
            if (Objects.equals(subPathDto.getType(), "walk")) {
                String urlInfo = buildDefaultUrl(subPathDto.getStartDto(), subPathDto.getEndDto());
                StringBuilder sb = getResponse(urlInfo);
                JsonNode jsonNode = objectMapper.readTree(sb.toString());

                JsonNode routesNode = jsonNode.path("routes").get(0);

                double totalDistance = routesNode.path("distance").asDouble();
                double totalTime = routesNode.path("duration").asDouble();
                JsonNode legsNode = routesNode.path("legs").get(0);
                JsonNode stepsNode = legsNode.path("steps");

                List<PointDto> pointDtos = new ArrayList<>();

                for (JsonNode step : stepsNode) {
                    String polyline = step.path("geometry").asText();

                    List<LatLng> decode = PolylineEncoding.decode(polyline);
                    for (LatLng latLng : decode) {
                        Double latitude = latLng.lat;
                        Double longitude = latLng.lng;

                        PointInformationDto pointInformationDto = PointInformationDto.builder()
                                .latitude(latitude)
                                .longitude(longitude)
                                .build();

                        PointDto pointDto = PointDto.builder()
                                .subPathId(subPathDto.getSubPathId())
                                .pointInformationDto(pointInformationDto)
                                .build();

                        pointDtos.add(pointDto);
                    }
                }
                long roundedTime = (long) ((totalTime % 60 >= 30) ? ((totalTime / 60) + 1) : (totalTime / 60));
                subPathDto.setPointDtos(pointDtos);
                subPathDto.setTime(roundedTime);
                subPathDto.setDistance((long) totalDistance);
            }
            result.add(subPathDto);
        }
        return result;
    }

    /**
     * 뽀송 osrm 도보 경로
     *
     * @param pathDto : 경로 Dto
     * @return : 뽀송 도보 경로가 포함된 경로
     * @throws IOException
     */
    public List<SubPathDto> createPposongSubPaths(PathDto pathDto) throws IOException {
        List<SubPathDto> subPathDtos = pathDto.getSubPathDtos();

        List<SubPathDto> result = new ArrayList<>();
        ObjectMapper objectMapper = new ObjectMapper();

        for (SubPathDto subPathDto : subPathDtos) {
            if (Objects.equals(subPathDto.getType(), "walk")) {
                String urlInfo = buildPposongUrl(subPathDto.getStartDto(), subPathDto.getEndDto());
                StringBuilder sb = getResponse(urlInfo);
                JsonNode jsonNode = objectMapper.readTree(sb.toString());

                JsonNode routesNode = jsonNode.path("routes").get(0);

                double totalDistance = routesNode.path("distance").asDouble();
                double totalTime = routesNode.path("duration").asDouble();
                JsonNode legsNode = routesNode.path("legs").get(0);
                JsonNode stepsNode = legsNode.path("steps");

                List<PointDto> pointDtos = new ArrayList<>();

                for (JsonNode step : stepsNode) {
                    String polyline = step.path("geometry").asText();

                    List<LatLng> decode = PolylineEncoding.decode(polyline);
                    for (LatLng latLng : decode) {
                        Double latitude = latLng.lat;
                        Double longitude = latLng.lng;

                        PointInformationDto pointInformationDto = PointInformationDto.builder()
                                .latitude(latitude)
                                .longitude(longitude)
                                .build();

                        PointDto pointDto = PointDto.builder()
                                .subPathId(subPathDto.getSubPathId())
                                .pointInformationDto(pointInformationDto)
                                .build();

                        pointDtos.add(pointDto);
                    }
                }
                double roundedTime = (totalTime % 60 >= 30) ? ((totalTime / 60) + 1) : (totalTime / 60);
                subPathDto.setPointDtos(pointDtos);
                subPathDto.setTime((long) roundedTime / 7 == 0 ? 3 : (long) roundedTime / 7);
                subPathDto.setDistance((long) totalDistance);
            }
            result.add(subPathDto);
        }
        return result;
    }

    /**
     * 날씨 정보를 포함한 도보 경로
     *
     * @param pathDto: 경로 Dto
     * @return 도보 경로와 날씨 정보가 포함된 경로
     * @throws IOException
     */
    public List<SubPathDto> createSubPathsWithForecast(PathDto pathDto, String selectTime) throws IOException {
        DateTimeFormatter inputFormatter = DateTimeFormatter.ofPattern("HHmm");
        DateTimeFormatter outputFormatter = DateTimeFormatter.ofPattern("HH00");
        LocalTime time = LocalTime.parse(selectTime, inputFormatter);
        List<SubPathDto> subPathDtos = pathDto.getSubPathDtos();
        List<SubPathDto> result = new ArrayList<>();

        for (SubPathDto subPathDto : subPathDtos) {
            time.plusMinutes(subPathDto.getTime()).format(outputFormatter);
            if (Objects.equals(subPathDto.getType(), "walk")) {
                ForecastDto forecastDto = ForecastDto.builder()
                        .time(time.format(outputFormatter))
                        .x(subPathDto.getMidDto().getX().toString())
                        .y(subPathDto.getMidDto().getY().toString())
                        .build();

                ForecastDto forecastByTimeAndXAndY = forecastService.findForecastByTimeAndXAndY(forecastDto);
                Double expectedRain = subPathDto.getTime() * Double.parseDouble(forecastByTimeAndXAndY.getRn1()) / 60;

                subPathDto.setForecastDto(forecastByTimeAndXAndY);
                subPathDto.setExpectedRain(expectedRain);
            }
            result.add(subPathDto);
        }
        return result;
    }


    private static StringBuilder getResponse(String urlInfo) throws IOException {
        URL url = new URL(urlInfo);

        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Content-type", "application/json");
        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(conn.getInputStream()));

        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = bufferedReader.readLine()) != null) {
            sb.append(line);
        }

        bufferedReader.close();
        conn.disconnect();

        return sb;
    }

    private String buildDefaultUrl(PointInformationDto start, PointInformationDto end) {
        String urlInfo = String.format(
                "https://routing.openstreetmap.de/routed-foot/route/v1/foot/%s,%s;%s,%s?overview=false&steps=true",
                URLEncoder.encode(Double.toString(start.getLongitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(start.getLatitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(end.getLongitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(end.getLatitude()), StandardCharsets.UTF_8)
        );
        return urlInfo;
    }

    private String buildPposongUrl(PointInformationDto start, PointInformationDto end) {
        String urlInfo = String.format(
                "http://osrm-routed:5000/route/v1/foot/%s,%s;%s,%s?overview=false&steps=true",
                URLEncoder.encode(Double.toString(start.getLongitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(start.getLatitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(end.getLongitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(end.getLatitude()), StandardCharsets.UTF_8)
        );
        return urlInfo;
    }
}
