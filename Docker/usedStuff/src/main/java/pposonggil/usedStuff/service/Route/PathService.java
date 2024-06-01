package pposonggil.usedStuff.service.Route;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pposonggil.usedStuff.domain.Member;
import pposonggil.usedStuff.domain.Route.LatXLngY;
import pposonggil.usedStuff.domain.Route.Path;
import pposonggil.usedStuff.domain.Route.PointInformation;
import pposonggil.usedStuff.dto.Forecast.ForecastDto;
import pposonggil.usedStuff.dto.Forecast.ForecastSubPathDto;
import pposonggil.usedStuff.dto.Route.Path.PathDto;
import pposonggil.usedStuff.dto.Route.PointInformation.PointInformationDto;
import pposonggil.usedStuff.dto.Route.SubPath.SubPathDto;
import pposonggil.usedStuff.repository.member.MemberRepository;
import pposonggil.usedStuff.repository.route.path.PathRepository;
import pposonggil.usedStuff.repository.route.point.PointRepository;
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
public class PathService {
    @Value("${api-key.ODsay-key}")
    private String apiKey;

    private final MemberRepository memberRepository;
    private final PathRepository pathRepository;
    private final SubPathService subPathService;
    private final ForecastService forecastService;
    private final PointRepository pointRepository;

    /**
     * 대중교통 경로 리스트 생성
     * 도보경로 X
     */
    public List<PathDto> createPaths(PointInformationDto start, PointInformationDto end) throws IOException {
        String urlInfo = buildUrl(start, end);
        StringBuilder sb = getResponse(urlInfo);
        return getPathDtos(sb, start, end);
    }

    /**
     * 선택한 시각에 따른
     * SubPath 내 예상되는 기상 정보 및 강수량 리스트 생성
     */
    public List<ForecastSubPathDto> createForecastBySubPath(PathDto pathDto, String selectTime) {
        List<ForecastSubPathDto> result = new ArrayList<>();
        String standardTime = selectTime.substring(0, 2) + "00";
        Long duration = null;

        for (SubPathDto subPathDto : pathDto.getSubPathDtos()) {
            duration = subPathDto.getTime();
            if (Objects.equals(subPathDto.getType(), "walk")) {
                ForecastDto forecastDto = ForecastDto.builder()
                        .time(standardTime)
                        .x(subPathDto.getMidDto().getX().toString())
                        .y(subPathDto.getMidDto().getY().toString())
                        .build();

                ForecastDto forecastDto1 = forecastService.findForecastByTimeAndXAndY(forecastDto);

                ForecastSubPathDto forecastSubPathDto = ForecastSubPathDto.builder()
                        .time(subPathDto.getTime().toString())
                        .expectedRain(String.format("%.2f", Double.parseDouble(forecastDto1.getRn1()) / 60 * subPathDto.getTime()))
                        .rn1(forecastDto1.getRn1())
                        .t1h(forecastDto1.getT1h())
                        .reh(forecastDto1.getReh())
                        .wsd(forecastDto1.getWsd())
                        .latitude(subPathDto.getMidDto().getLatitude())
                        .longitude(subPathDto.getMidDto().getLongitude())
                        .build();

                result.add(forecastSubPathDto);
            }
            LocalTime curTime = LocalTime.parse(selectTime, DateTimeFormatter.ofPattern("HHmm"));
            LocalTime updateTime = curTime.plusMinutes(duration);
            standardTime = updateTime.format(DateTimeFormatter.ofPattern("HH")) + "00";
        }
        return result;
    }

    /**
     * default osrm을 이용한 도보 경로가 포함된
     * 대중교통 경로
     */
    public PathDto selectDefaultPath(PathDto pathDto) throws IOException {
        List<SubPathDto> walkSubPaths = subPathService.createDefaultSubPaths(pathDto);
        pathDto.setSubPathDtos(walkSubPaths);
        return pathDto;
    }

    /**
     * 선택한 경로를 db에 저장
     * 도보 경로X
     * 날씨 정보X
     */
    @Transactional
    public Long createPath(PathDto pathDto) {
        Member routeRequester = memberRepository.findById(pathDto.getRouteRequesterId())
                .orElseThrow(() -> new NoSuchElementException("Member not found with id: " + pathDto.getRouteRequesterId()));

        Path path = pathDto.toEntity();

        path.setRouteRequester(routeRequester);
        pathRepository.save(path);

        return path.getId();
    }

    private static List<PathDto> getPathDtos(StringBuilder sb, PointInformationDto start, PointInformationDto end) throws JsonProcessingException {
        List<PathDto> pathDtos = new ArrayList<>();
        ObjectMapper objectMapper = new ObjectMapper();

        JsonNode jsonNode = objectMapper.readTree(sb.toString());
        JsonNode result = jsonNode.get("result");
        JsonNode path = result.get("path");
        for (JsonNode node : path) {
            PathDto pathDto = PathDto.fromJsonNode(node, start, end);
            pathDtos.add(setUpStartMidEndTime(pathDto));
        }
        return pathDtos;
    }

    private static PathDto setUpStartMidEndTime(PathDto pathDto) {
        List<SubPathDto> subPathDtos = pathDto.getSubPathDtos();
        long setTotalWalkTime = 0L;

        for (int idx = 0; idx < subPathDtos.size(); idx++) {
            SubPathDto subPathDto = subPathDtos.get(idx);

            if (Objects.equals(subPathDto.getType(), "walk")) {
                setTotalWalkTime = setTotalWalkTime + subPathDto.getTime();

                if (idx == 0) {
                    subPathDto.setStartDto(pathDto.getStartDto());
                    subPathDto.setEndDto(subPathDtos.get(1)
                            .getPointDtos().getFirst().getPointInformationDto());
                } else if (idx == subPathDtos.size() - 1) {
                    subPathDto.setStartDto(subPathDtos.get(idx - 1).getEndDto());
                    subPathDto.setEndDto(pathDto.getEndDto());
                } else {
                    subPathDto.setStartDto(subPathDtos.get(idx - 1).getStartDto());
                    subPathDto.setEndDto(subPathDtos.get(idx + 1)
                            .getPointDtos().getFirst().getPointInformationDto());
                }
            } else {
                subPathDto.setStartDto(subPathDto.getPointDtos().getFirst().getPointInformationDto());
                subPathDto.setEndDto(subPathDto.getPointDtos().getLast().getPointInformationDto());
            }
            subPathDto.setMidDto(getPointMidDto(subPathDto.getStartDto().toEntity(),
                    subPathDto.getEndDto().toEntity()));
        }

        for (SubPathDto subPathDto : pathDto.getSubPathDtos()) {
            if (Objects.equals(subPathDto.getType(), "walk"))
                setTotalWalkTime = setTotalWalkTime + subPathDto.getTime();

        }
        pathDto.setTotalWalkTime(setTotalWalkTime);

        return pathDto;
    }

    private static PointInformationDto getPointMidDto(PointInformation startDto, PointInformation endDto) {
        LatXLngY midLatXLngY = LatXLngY.convertGRID_GPS(LatXLngY.TO_GRID,
                ((startDto.getLatitude() + endDto.getLatitude()) / 2),
                ((startDto.getLongitude() + endDto.getLongitude()) / 2));

        PointInformationDto midDto = PointInformationDto.builder()
                .latitude(midLatXLngY.lat)
                .longitude(midLatXLngY.lng)
                .x((long) midLatXLngY.x)
                .y((long) midLatXLngY.y)
                .build();

        return midDto;
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

    private String buildUrl(PointInformationDto start, PointInformationDto end) {
        String urlInfo = String.format(
                "https://api.odsay.com/v1/api/searchPubTransPathT?SX=%s&SY=%s&EX=%s&EY=%s&apiKey=%s",
                URLEncoder.encode(Double.toString(start.getLongitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(start.getLatitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(end.getLongitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(Double.toString(end.getLatitude()), StandardCharsets.UTF_8),
                URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
        );
        return urlInfo;
    }
}