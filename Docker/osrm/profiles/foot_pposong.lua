-- Foot profile

api_version = 2

Set = require('lib/set')
Sequence = require('lib/sequence')
Handlers = require("lib/way_handlers")
find_access_tag = require("lib/access").find_access_tag

function setup()
  local walking_speed = 5
  return {
    properties = {
      weight_name                   = 'duration',
      max_speed_for_map_matching    = 40/3.6, -- kmph -> m/s
      call_tagless_node_function    = false,
      traffic_light_penalty         = 2,
      u_turn_penalty                = 2,
      rain_penalty                  = 60,
      continue_straight_at_waypoint = false,
      use_turn_restrictions         = false,
    },

    default_mode            = mode.walking,
    default_speed           = walking_speed,
    oneway_handling         = 'specific',     -- respect 'oneway:foot' but not 'oneway'

    barrier_blacklist = Set {
      'yes',
      'wall',
      'fence'
    },

    tunnel_blacklist = Set {
      'no',
      'culvert', -- 길 아래 수로
      'flooded', -- 홍수 방지 수로
      'avalanche_protector' -- 산사태 방지 터널
    },

    access_tag_whitelist = Set {
      'yes',
      'foot',
      'permissive',
      'designated'
    },

    access_tag_blacklist = Set {
      'no',
      'agricultural',
      'forestry',
      'private',
      'delivery',
    },

    restricted_access_tag_list = Set { },

    restricted_highway_whitelist = Set { },

    construction_whitelist = Set {},

    access_tags_hierarchy = Sequence {
      'tunnel',
      'covered',
      'foot',
      'access'
    },

    -- tags disallow access to in combination with highway=service
    service_access_tag_blacklist = Set { },

    restrictions = Sequence {
      'foot'
    },

    -- list of suffixes to suppress in name change instructions
    suffix_list = Set {
      'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'North', 'South', 'West', 'East'
    },

    avoid = Set {
      'impassable',
      'proposed'
    },

    speeds = Sequence {
      highway = {
        primary         = walking_speed * 1.1,
        primary_link    = walking_speed * 1.1,
        secondary       = walking_speed * 1.1,
        secondary_link  = walking_speed * 1.1,
        tertiary        = walking_speed * 1.1,
        tertiary_link   = walking_speed * 1.1,
        unclassified    = walking_speed,
        residential     = walking_speed,
        road            = walking_speed,
        living_street   = walking_speed,
        service         = walking_speed,
        track           = walking_speed,
        path            = walking_speed,
        steps           = walking_speed,
        pedestrian      = walking_speed,
        footway         = walking_speed,
        pier            = walking_speed,
      },

      railway = {
        platform        = walking_speed
      },

      amenity = {
        parking         = walking_speed,
        parking_entrance= walking_speed,
        covered         = walking_speed,
      },

      man_made = {
        pier            = walking_speed
      },

      leisure = {
        track           = walking_speed
      },

      -- 터널 속성 가진 길의 속도 증가
      tunnel = {
        yes             = walking_speed,
        covered         = walking_speed,
        building_passage= walking_speed,
      },

      -- covered 속성 가진 길의 속도 증가
      covered = {
        yes             = walking_speed,
        booth           = walking_speed,
        arcade          = walking_speed,
        building_passage= walking_speed,
        roof            = walking_speed,
      }
    },

    route_speeds = {
      ferry = 5
    },

    bridge_speeds = {
    },

    surface_speeds = {
      fine_gravel =   walking_speed*0.75,
      gravel =        walking_speed*0.75,
      pebblestone =   walking_speed*0.75,
      mud =           walking_speed*0.5,
      sand =          walking_speed*0.5
    },

    tracktype_speeds = {
    },

    smoothness_speeds = {
    }
  }
end

function process_node(profile, node, result)
  -- parse access and barrier tags
  local access = find_access_tag(node, profile.access_tags_hierarchy)
  if access then
    if profile.access_tag_blacklist[access] then
      result.barrier = true
    end
  else
    local barrier = node:get_value_by_key("barrier")
    if barrier then
      --  make an exception for rising bollard barriers
      local bollard = node:get_value_by_key("bollard")
      local rising_bollard = bollard and "rising" == bollard

      if profile.barrier_blacklist[barrier] and not rising_bollard then
        result.barrier = true
      end
    end
  end

  -- check if node is a traffic light
  local tag = node:get_value_by_key("highway")
  if "traffic_signals" == tag then
    -- Direction should only apply to vehicles
    result.traffic_lights = true
  end
end

-- main entry point for processsing a way
function process_way(profile, way, result)
  -- the intial filtering of ways based on presence of tags
  -- affects processing times significantly, because all ways
  -- have to be checked.
  -- to increase performance, prefetching and intial tag check
  -- is done in directly instead of via a handler.

  -- in general we should  try to abort as soon as
  -- possible if the way is not routable, to avoid doing
  -- unnecessary work. this implies we should check things that
  -- commonly forbids access early, and handle edge cases later.

  -- data table for storing intermediate values during processing
  local data = {
    -- prefetch tags
    highway = way:get_value_by_key('highway'),
    bridge = way:get_value_by_key('bridge'),
    route = way:get_value_by_key('route'),
    leisure = way:get_value_by_key('leisure'),
    man_made = way:get_value_by_key('man_made'),
    railway = way:get_value_by_key('railway'),
    platform = way:get_value_by_key('platform'),
    amenity = way:get_value_by_key('amenity'),
    public_transport = way:get_value_by_key('public_transport')
  }

  -- perform an quick initial check and abort if the way is
  -- obviously not routable. here we require at least one
  -- of the prefetched tags to be present, ie. the data table
  -- cannot be empty
  if next(data) == nil then     -- is the data table empty?
    return
  end

  local handlers = Sequence {
    -- set the default mode for this profile. if can be changed later
    -- in case it turns we're e.g. on a ferry
    WayHandlers.default_mode,

    -- check various tags that could indicate that the way is not
    -- routable. this includes things like status=impassable,
    -- toll=yes and oneway=reversible
    WayHandlers.blocked_ways,

    -- determine access status by checking our hierarchy of
    -- access tags, e.g: motorcar, motor_vehicle, vehicle
    WayHandlers.access,

    -- check whether forward/backward directons are routable
    WayHandlers.oneway,

    -- check whether forward/backward directons are routable
    WayHandlers.destinations,

    -- check whether we're using a special transport mode
    WayHandlers.ferries,
    WayHandlers.movables,

    -- compute speed taking into account way type, maxspeed tags, etc.
    WayHandlers.speed,
    WayHandlers.surface,

    -- handle turn lanes and road classification, used for guidance
    WayHandlers.classification,

    -- handle various other flags
    WayHandlers.roundabouts,
    WayHandlers.startpoint,

    -- set name, ref and pronunciation
    WayHandlers.names,

    -- set weight properties of the way
    WayHandlers.weights
  }

  WayHandlers.run(profile, way, result, data, handlers)

  local other_tags = way:get_value_by_key("other_tags")
  local check = 0

  if other_tags then
    local tags = parse_other_tags(other_tags)  

    -- 사람이 지나갈 수 있는 터널 
    -- 어드밴티지 부여
    if tags["tunnel"] and not profile.tunnel_blacklist[tags["tunnel"]] then
      check = check + 1
      result.duration = result.duration - profile.properties.rain_penalty
      result.forward_speed = result.forward_speed * 12.0
      result.backward_speed = result.backward_speed * 12.0
    end

    -- 객체가 무언가로 덮여 있는지 나타내는 tag
    -- 부스, 아치형 지붕, 가로수, 지붕있는 통행로, 지붕, ...
    -- 어드밴티지 부여
    if tags["covered"] == "yes" then
      check = check + 1
      result.duration = result.duration - profile.properties.rain_penalty
      result.forward_speed = result.forward_speed * 10.0
      result.backward_speed = result.backward_speed * 10.0
    end
  end

  -- 해당 태그(tunnel, covered)가 없는 길의 속도 감소
  if check == 0 then
    result.forward_speed = result.forward_speed * 0.1
    result.backward_speed = result.backward_speed * 0.1
  end
end

function process_turn (profile, turn)
  turn.duration = 0.

  if turn.direction_modifier == direction_modifier.u_turn then
     turn.duration = turn.duration + profile.properties.u_turn_penalty
  end

  if turn.has_traffic_light then
     turn.duration = profile.properties.traffic_light_penalty
  end
  if profile.properties.weight_name == 'routability' then
      -- penalize turns from non-local access only segments onto local access only tags
      if not turn.source_restricted and turn.target_restricted then
          turn.weight = turn.weight + 3000
      end
  end
end

-- 태그 문자열 파싱하는 함수
-- 태그 문자열은
-- "tunnel"=>"building_passage"
-- "covered"=>"yes"와 같은 형식으로 이루어져 있음
function parse_other_tags(other_tags)
  local tags = {}
  for key, value in string.gmatch(other_tags, "\"(.-)\"=>\"(.-)\"") do
      tags[key] = value
  end
  return tags
end


return {
  setup = setup,
  process_way =  process_way,
  process_node = process_node,
  process_turn = process_turn
}
