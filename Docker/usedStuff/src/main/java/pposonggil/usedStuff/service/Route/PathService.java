package pposonggil.usedStuff.service.Route;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.stream.Collectors;

@Slf4j
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
    public List<PathDto> createPaths(PointInformationDto start, PointInformationDto end, String selectTime, Long requesterId) throws IOException {
        try {
            memberRepository.findById(requesterId)
                    .orElseThrow(() -> new NoSuchElementException("Member not found with id: " + requesterId));

            String urlInfo = buildUrl(start, end);
            StringBuilder sb = getResponse(urlInfo);
            List<PathDto> pathDtos = getPathDtos(sb, start, end, requesterId);

            long index = 0;
            for (PathDto pathDto : pathDtos) {
                pathDto.setIndex(index);
                index = index + 1;
            }

            try {
                calTotalRains(pathDtos, selectTime);
            } catch (NullPointerException e) {
                log.info("기상 정보가 없습니다." + e.getMessage());
            }

            return pathDtos;
        } catch (IOException e) {
            // IOException 처리 로직
            e.printStackTrace();
            throw new RuntimeException("IOException occurred", e);
        } catch (NoSuchElementException e) {
            // NoSuchElementException 처리 로직
            e.printStackTrace();
            throw e;
        } catch (Exception e) {
            // 기타 예외 처리 로직
            e.printStackTrace();
            throw new RuntimeException("An error occurred", e);
        }
    }

    /**
     * 대중교통 경로 하나 생성
     * 도보경로 X
     */
    public PathDto createPath(PointInformationDto start, PointInformationDto end, String selectTime, Long requesterId) throws IOException {
        try {
            memberRepository.findById(requesterId)
                    .orElseThrow(() -> new NoSuchElementException("Member not found with id: " + requesterId));

            String urlInfo = buildUrl(start, end);
            StringBuilder sb = getResponse(urlInfo);
            PathDto pathDto = getPathDto(sb, start, end, requesterId);

            List<SubPathDto> defaultSubPaths = subPathService.createDefaultSubPaths(pathDto);
            pathDto.setSubPathDtos(defaultSubPaths);

            try {
                calTotalRain(pathDto, selectTime);
            } catch (NullPointerException e) {
                log.info("기상 정보가 없습니다." + e.getMessage());
            }

            return pathDto;
        } catch (IOException e) {
            // IOException 처리 로직
            e.printStackTrace();
            throw new RuntimeException("IOException occurred", e);
        } catch (NoSuchElementException e) {
            // NoSuchElementException 처리 로직
            e.printStackTrace();
            throw e;
        } catch (Exception e) {
            // 기타 예외 처리 로직
            e.printStackTrace();
            throw new RuntimeException("An error occurred", e);
        }
    }

    /**
     * 탐색한 경로들의 예상 강수량 계산
     */
    private void calTotalRains(List<PathDto> pathDtos, String selectTime) {
        try {
            for (PathDto pathDto : pathDtos) {
                List<ForecastSubPathDto> forecastSubPathDtos = createForecastBySubPath(pathDto, selectTime);
                double totalRain = 0.0;
                for (ForecastSubPathDto forecastSubPathDto : forecastSubPathDtos) {
                    totalRain = totalRain + Double.parseDouble(forecastSubPathDto.getExpectedRain());
                }
                pathDto.setTotalRain(totalRain);
            }
        } catch (RuntimeException e) {
            e.printStackTrace();
            throw new RuntimeException("Runtime exception in calTotalRain", e);
        }
    }

    /**
     * 탐색한 경로의 예상 강수량 계산
     */
    private void calTotalRain(PathDto pathDto, String selectTime) {
        try {
            List<ForecastSubPathDto> forecastSubPathDtos = createForecastBySubPath(pathDto, selectTime);
            double totalRain = 0.0;
            for (ForecastSubPathDto forecastSubPathDto : forecastSubPathDtos) {
                totalRain = totalRain + Double.parseDouble(forecastSubPathDto.getExpectedRain());
            }
            pathDto.setTotalRain(totalRain);

        } catch (RuntimeException e) {
            e.printStackTrace();
            throw new RuntimeException("Runtime exception in calTotalRain", e);
        }
    }

    /**
     * 선택한 시각에 따른
     * SubPath 내 예상되는 기상 정보 및 강수량 리스트 생성
     */
    public List<ForecastSubPathDto> createForecastBySubPath(PathDto pathDto, String selectTime) {
        try {
            List<ForecastSubPathDto> result = new ArrayList<>();
            String standardTime = selectTime.substring(0, 2) + "00";
            Long duration = null;

            for (SubPathDto subPathDto : pathDto.getSubPathDtos()) {
                duration = subPathDto.getTime();

                if (Objects.equals(subPathDto.getType(), "walk") && subPathDto.getTime() != 0) {
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
        } catch (RuntimeException e) {
            e.printStackTrace();
            throw new RuntimeException("Runtime exception in createForecastBySubPath", e);
        }
    }

    /**
     * default osrm을 이용한 도보 경로가 포함된
     * 대중교통 경로
     */
    public PathDto selectDefaultPath(PathDto pathDto) throws IOException {
        List<SubPathDto> walkSubPaths = subPathService.createDefaultSubPaths(pathDto);
        updateTotalTime(pathDto, walkSubPaths);
        pathDto.setSubPathDtos(walkSubPaths);
        return pathDto;
    }


    /**
     * pposong osrm을 이용한 뽀송 도보 경로가 포함된
     * 대중교통 경로
     */
    public PathDto selectPposongPath(PathDto pathDto) throws IOException {
        List<SubPathDto> walkSubPaths = subPathService.createPposongSubPaths(pathDto);
        updateTotalTime(pathDto, walkSubPaths);
        pathDto.setSubPathDtos(walkSubPaths);
        return pathDto;
    }

    private static void updateTotalTime(PathDto pathDto, List<SubPathDto> walkSubPaths) {
        long totalTime = 0L;
        for (SubPathDto subPathDto : walkSubPaths) {
            totalTime = totalTime + subPathDto.getTime();
        }
        pathDto.setTotalTime(totalTime);
    }

    /**
     * 날씨 정보, 도보 경로가 포함된 osrm 및
     * Odsay 대중교통 경로
     */
    public PathDto selectPathWithForecast(PathDto pathDto, String selectTime) throws IOException {
        List<SubPathDto> walkSubPaths = subPathService.createSubPathsWithForecast(pathDto, selectTime);
        pathDto.setSubPathDtos(walkSubPaths);
        calTotalRain(pathDto, selectTime);
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

    /**
     * 전체 경로 조회
     *
     * @return db에 저장된 모든 경로 리스트
     */
    public List<PathDto> findPaths() {
        List<Path> paths = pathRepository.findAll();
        return paths.stream()
                .map(PathDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 멤버 아이디에 해당하는 경로 조회
     *
     * @param requesterId: 경로 저장한 회원 아이디
     * @return
     */
    public List<PathDto> findPathsByMember(Long requesterId) {
        List<Path> paths = pathRepository.findPathsWithByMemberByRequesterId(requesterId);
        return paths.stream()
                .map(PathDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 경로 삭제
     *
     * @param pathId
     */
    @Transactional
    public void deletePath(Long pathId) {
        Path path = pathRepository.findById(pathId)
                .orElseThrow(() -> new NoSuchElementException("Path not found with id: " + pathId));
        pathRepository.delete(path);
    }

    private static List<PathDto> getPathDtos(StringBuilder sb, PointInformationDto start, PointInformationDto end, Long requesterId) throws JsonProcessingException {
        List<PathDto> pathDtos = new ArrayList<>();
        ObjectMapper objectMapper = new ObjectMapper();

        JsonNode jsonNode = objectMapper.readTree(sb.toString());
        JsonNode result = jsonNode.get("result");
        JsonNode path = result.get("path");
        for (JsonNode node : path) {
            PathDto pathDto = PathDto.fromJsonNode(node, start, end);
            pathDto.setRouteRequesterId(requesterId);
            pathDtos.add(setUpStartMidEndTime(pathDto));
        }
        return pathDtos;
    }

    private static PathDto getPathDto(StringBuilder sb, PointInformationDto start, PointInformationDto end, Long requesterId) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();

        JsonNode jsonNode = objectMapper.readTree(sb.toString());
        JsonNode result = jsonNode.get("result");
        JsonNode path = result.get("path");
        JsonNode node = path.get(0);

        PathDto pathDto = PathDto.fromJsonNode(node, start, end);
        pathDto.setRouteRequesterId(requesterId);

        return setUpStartMidEndTime(pathDto);
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
                    subPathDto.setStartDto(subPathDtos.get(idx - 1).getEndDto());
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
