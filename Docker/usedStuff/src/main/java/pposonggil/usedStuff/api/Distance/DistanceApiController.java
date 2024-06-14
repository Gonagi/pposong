package pposonggil.usedStuff.api.Distance;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pposonggil.usedStuff.dto.Distance.DistanceDto;
import pposonggil.usedStuff.dto.Route.PointInformation.PointInformationDto;
import pposonggil.usedStuff.service.Distance.DistanceService;
import pposonggil.usedStuff.service.Trade.TradeService;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DistanceApiController {
    public final DistanceService distanceService;
    public final TradeService tradeService;

    /**
     * 거래를 포함한 전체 거리 조회
     *
     * @return 거리 Dto 리스트
     */
    @GetMapping("/api/distances")
    public List<DistanceDto> distances() {
        return distanceService.findDistanceWithTrade();
    }

    /**
     * 거리 아이디로 거리 조회
     *
     * @param distanceId
     *
     * @return 거리 아이디가 일치하는 거리 Dto
     */
    @GetMapping("/api/distance/by-distance/{distanceId}")
    public DistanceDto getDistanceByDistanceId(@PathVariable Long distanceId) {
        return distanceService.findOne(distanceId);
    }

    /**
     * 거래 아이디로 거리 조회
     *
     * @param tradeId : 거래 아이디
     * @return 거래 아이디가 일치하는 거리 Dto
     */
    @GetMapping("/api/distance/by-trade/{tradeId}")
    public DistanceDto findDistanceWithTradeByTradeId(@PathVariable Long tradeId) {
        return distanceService.findDistacneByTradeId(tradeId);
    }

    /**
     * 회원 아이디로 회원의 거리 업데이트
     *
     * @param distanceId : 업데이트할 거리 아이디
     * @param memberId   : 회원 아이디
     * @param startDto   : 현재 출발지 Dto
     * @return : 성공 --> 업데이트된 거리 Dto
     */
    @PutMapping("/api/distance/{distanceId}/by-member/{memberId}")
    public DistanceDto updateDistance(@PathVariable Long distanceId,
                                             @PathVariable Long memberId,
                                             @RequestPart PointInformationDto startDto) {
        DistanceDto distanceDto = distanceService.findOne(distanceId);
        return distanceService.calMemberDistance(startDto, distanceDto, memberId);
    }

    /**
     * 거리 아이디로 거리 삭제
     *
     * @param distanceId: 거리 아이디
     * @return 성공 --> "거리를 삭제하였습니다."
     */
    @DeleteMapping("/api/distance/{distanceId}")
    public ResponseEntity<String> deleteDistance(@PathVariable Long distanceId) {
        distanceService.deleteDistance(distanceId);

        return ResponseEntity.ok("거리를 삭제하였습니다.");
    }
}
