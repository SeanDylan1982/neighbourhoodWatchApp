import React from "react";
import { Box } from "@mui/material";
import { Icon } from "@iconify/react";
import * as MuiIcons from "@mui/icons-material";

/**
 * Fluent Icon Component that displays colorful Fluent UI System Color icons with Material UI fallbacks
 *
 * @param {Object} props
 * @param {string} props.name - Name of the icon (e.g., 'Home', 'Settings', 'Add')
 * @param {number} props.size - Size of the icon in pixels (default: 24)
 * @param {string} props.color - Color of the icon (default: 'inherit' - for colorful icons, use 'auto')
 * @param {Object} props.sx - Additional styles for the container
 * @param {Function} props.onClick - Click handler
 */
const FluentIcon = ({
  name,
  size = 24,
  color = "auto", // Default to 'auto' for colorful icons
  sx = {},
  onClick,
  ...props
}) => {
  // Get Fluent Color icon from Iconify
  const getFluentColorIcon = () => {
    // Mapping to Fluent Color icons from @iconify-json/fluent-color
    const fluentColorIconMap = {
      // Navigation and interface
      Home: "fluent-color:home-24",
      Dashboard: "fluent-color:apps-24",
      Settings: "fluent-color:settings-24",
      Person: "fluent-color:person-24",
      People: "fluent-color:people-team-24",
      PersonAdd: "fluent-color:person-add-28",
      PersonRemove: "fluent-color:person-warning-24",
      AdminPanelSettings: "fluent-color:shield-24",

      // Communication
      Chat: "fluent-color:chat-24",
      Message: "fluent-color:mail-24",
      Email: "fluent-color:mail-multiple-24",
      Phone: "fluent-color:phone-24",
      Campaign: "fluent-color:megaphone-loud-24",
      Contacts: "fluent-color:people-list-24",

      // Actions
      Add: "fluent-color:add-circle-24",
      Remove: "fluent-color:dismiss-circle-24",
      Edit: "fluent-color:edit-24",
      Delete: "fluent-color:dismiss-circle-24",
      Close: "fluent-color:dismiss-circle-24",
      Check: "fluent-color:checkmark-circle-24",
      Search: "fluent-color:search-sparkle-24",

      // Navigation arrows
      ArrowBack: "fluent-color:arrow-left-24",
      ArrowForward: "fluent-color:arrow-right-24",
      KeyboardArrowUp: "fluent-color:chevron-up-24",
      KeyboardArrowDown: "fluent-color:chevron-down-24",
      ChevronLeft: "fluent-color:chevron-left-24",
      ChevronRight: "fluent-color:chevron-right-24",
      Menu: "fluent-color:navigation-24",

      // Content and status
      Report: "fluent-color:text-bullet-list-square-sparkle-24",
      Reports: "fluent-color:text-bullet-list-square-sparkle-24",
      NoticeBoard: "fluent-color:clipboard-text-edit-24",
      Warning: "fluent-color:warning-24",
      Error: "fluent-color:dismiss-circle-24",
      Info: "fluent-color:question-circle-24",
      Notifications: "fluent-color:alert-24",
      NotificationBell: "fluent-color:alert-badge-24",

      // Admin and system
      Admin: "fluent-color:person-starburst-24",
      SystemStats: "fluent-color:poll-24",
      AuditLog: "fluent-color:history-24",
      Location: "fluent-color:location-ripple-24",
      Profile: "fluent-color:person-24",

      // Security
      Security: "fluent-color:shield-checkmark-24",
      Lock: "fluent-color:lock-closed-24",
      Visibility: "fluent-color:calendar-checkmark-24",
      VisibilityOff: "fluent-color:calendar-cancel-24",

      // Documents and articles
      Article: "fluent-color:document-edit-24",

      // Media
      Image: "fluent-color:image-24",
      VideoFile: "fluent-color:video-24",
      InsertDriveFile: "fluent-color:table-24",
      CloudUpload: "fluent-color:cloud-24",

      // Social and engagement
      ThumbUp: "fluent-color:add-starburst-24",
      Comment: "fluent-color:comment-24",
      Share: "fluent-color:share-android-24",

      // Status and sync
      CloudOff: "fluent-color:add-starburst-24",
      Sync: "fluent-color:arrow-sync-24",
      AccessTime: "fluent-color:arrow-sync-24",
      Storage: "fluent-color:database-24",

      // Misc
      MoreVert: "fluent-color:diversity-24",
      LocationOn: "fluent-color:location-ripple-24",
      Palette: "fluent-color:location-ripple-24",

      // Additional icons used throughout the app
      Logout: "fluent-color:sign-out-24",
      Login: "fluent-color:person-arrow-right-24",
      Upload: "fluent-color:arrow-upload-24",
      Download: "fluent-color:arrow-download-24",
      Refresh: "fluent-color:arrow-clockwise-24",
      Save: "fluent-color:save-24",
      Cancel: "fluent-color:dismiss-circle-24",
      Send: "fluent-color:send-24",
      Reply: "fluent-color:arrow-reply-24",
      Forward: "fluent-color:arrow-forward-24",
      Star: "fluent-color:star-24",
      Heart: "fluent-color:heart-24",
      Like: "fluent-color:thumb-like-24",
      Dislike: "fluent-color:thumb-dislike-24",
      Flag: "fluent-color:flag-24",
      Bookmark: "fluent-color:bookmark-24",
      Pin: "fluent-color:pin-24",
      Archive: "fluent-color:archive-24",
      Folder: "fluent-color:folder-24",
      FolderOpen: "fluent-color:folder-open-24",
      File: "fluent-color:document-24",
      Copy: "fluent-color:copy-24",
      Cut: "fluent-color:cut-24",
      Paste: "fluent-color:clipboard-paste-24",
      Print: "fluent-color:print-24",
      QrCode: "fluent-color:qr-code-24",
      Wifi: "fluent-color:wifi-24",
      WifiOff: "fluent-color:wifi-warning-24",
      Battery: "fluent-color:battery-10-24",
      BatteryFull: "fluent-color:battery-10-24",
      Volume: "fluent-color:speaker-2-24",
      VolumeOff: "fluent-color:speaker-off-24",
      Mic: "fluent-color:mic-24",
      MicOff: "fluent-color:mic-off-24",
      Camera: "fluent-color:camera-24",
      CameraOff: "fluent-color:camera-off-24",
      Calendar: "fluent-color:calendar-24",
      CalendarAdd: "fluent-color:calendar-add-24",
      Clock: "fluent-color:clock-alarm-24",
      Timer: "fluent-color:timer-24",
      Alarm: "fluent-color:alarm-24",
      Map: "fluent-color:clock-alarm-24",
      Navigation: "fluent-color:clock-alarm-24",
      Compass: "fluent-color:compass-northwest-24",
      Globe: "fluent-color:globe-24",
      Language: "fluent-color:local-language-24",
      Translate: "fluent-color:translate-24",
      Filter: "fluent-color:filter-24",
      Sort: "fluent-color:arrow-sort-24",
      SortAsc: "fluent-color:arrow-sort-up-24",
      SortDesc: "fluent-color:arrow-sort-down-24",
      Grid: "fluent-color:grid-24",
      List: "fluent-color:apps-list-24",
      ViewModule: "fluent-color:grid-24",
      ViewList: "fluent-color:text-bullet-list-24",
      FullScreen: "fluent-color:full-screen-maximize-24",
      ExitFullScreen: "fluent-color:full-screen-minimize-24",
      ZoomIn: "fluent-color:zoom-in-24",
      ZoomOut: "fluent-color:zoom-out-24",
      Fit: "fluent-color:resize-24",
      Crop: "fluent-color:crop-24",
      Rotate: "fluent-color:arrow-rotate-clockwise-24",
      Flip: "fluent-color:flip-horizontal-24",
      Brightness: "fluent-color:brightness-high-24",
      Contrast: "fluent-color:circle-half-fill-24",
      ColorLens: "fluent-color:color-24",
      Brush: "fluent-color:paint-brush-24",
      FormatBold: "fluent-color:text-bold-24",
      FormatItalic: "fluent-color:text-italic-24",
      FormatUnderlined: "fluent-color:text-underline-24",
      FormatStrikethrough: "fluent-color:text-strikethrough-24",
      FormatAlignLeft: "fluent-color:text-align-left-24",
      FormatAlignCenter: "fluent-color:text-align-center-24",
      FormatAlignRight: "fluent-color:text-align-right-24",
      FormatListBulleted: "fluent-color:text-bullet-list-24",
      FormatListNumbered: "fluent-color:text-number-list-ltr-24",
      Link: "fluent-color:link-24",
      LinkOff: "fluent-color:link-dismiss-24",
      AttachFile: "fluent-color:attach-24",
      AttachMoney: "fluent-color:money-24",
      ShoppingCart: "fluent-color:cart-24",
      ShoppingBag: "fluent-color:shopping-bag-24",
      CreditCard: "fluent-color:payment-24",
      Receipt: "fluent-color:receipt-24",
      LocalOffer: "fluent-color:tag-24",
      Discount: "fluent-color:tag-dismiss-24",
      Percent: "fluent-color:calculator-24",
      TrendingUp: "fluent-color:data-trending-24",
      TrendingDown: "fluent-color:arrow-trending-down-24",
      Analytics: "fluent-color:chart-multiple-24",
      BarChart: "fluent-color:data-bar-vertical-ascending-24",
      PieChart: "fluent-color:data-pie-24",
      Timeline: "fluent-color:data-line-24",
      Speed: "fluent-color:top-speed-24",
      Dashboard2: "fluent-color:apps-24",
      Build: "fluent-color:wrench-screwdriver-24",
      Construction: "fluent-color:warning-24",
      Engineering: "fluent-color:arrow-clockwise-dashes-settings-24",
      Science: "fluent-color:beaker-24",
      Psychology: "fluent-color:brain-24",
      School: "fluent-color:building-people-24",
      MenuBook: "fluent-color:book-24",
      LibraryBooks: "fluent-color:book-star-24",
      Quiz: "fluent-color:clipboard-task-24",
      Assignment: "fluent-color:calendar-clock-24",
      Grade: "fluent-color:certificate-24",
      EmojiEvents: "fluent-color:building-government-search-24",
      EmojiObjects: "fluent-color:lightbulb-24",
      EmojiNature: "fluent-color:leaf-one-24",
      EmojiTransportation: "fluent-color:vehicle-car-24",
      EmojiFood: "fluent-color:food-24",
      EmojiFlagsOutlined: "fluent-color:flag-24",
      EmojiSymbols: "fluent-color:symbols-24",
      Pets: "fluent-color:paw-24",
      LocalHospital: "fluent-color:toolbox-24",
      LocalPharmacy: "fluent-color:pill-24",
      Healing: "fluent-color:heart-pulse-24",
      FitnessCenter: "fluent-color:dumbbell-24",
      SportsEsports: "fluent-color:games-24",
      SportsFootball: "fluent-color:sport-24",
      DirectionsRun: "fluent-color:run-24",
      DirectionsWalk: "fluent-color:walk-24",
      DirectionsBike: "fluent-color:vehicle-bicycle-24",
      DirectionsCar: "fluent-color:vehicle-car-24",
      DirectionsBus: "fluent-color:vehicle-bus-24",
      DirectionsSubway: "fluent-color:vehicle-subway-24",
      Flight: "fluent-color:airplane-24",
      Hotel: "fluent-color:building-multiple-24",
      Restaurant: "fluent-color:food-24",
      LocalCafe: "fluent-color:drink-coffee-24",
      LocalBar: "fluent-color:drink-wine-24",
      LocalGroceryStore: "fluent-color:shopping-bag-24",
      LocalMall: "fluent-color:building-shop-24",
      LocalGasStation: "fluent-color:gas-pump-24",
      LocalParking: "fluent-color:vehicle-car-parking-24",
      LocalAtm: "fluent-color:money-24",
      LocalLibrary: "fluent-color:library-24",
      LocalMovies: "fluent-color:movies-and-tv-24",
      LocalPlay: "fluent-color:games-24",
      Park: "fluent-color:tree-evergreen-24",
      Beach: "fluent-color:beach-24",
      Pool: "fluent-color:water-24",
      Spa: "fluent-color:leaf-one-24",
      Casino: "fluent-color:games-24",
      NightLife: "fluent-color:drink-wine-24",
      Festival: "fluent-color:music-note-1-24",
      TheaterComedy: "fluent-color:emoji-laugh-24",
      Museum: "fluent-color:building-bank-24",
      ChildCare: "fluent-color:person-24",
      Elderly: "fluent-color:accessibility-24",
      Accessible: "fluent-color:person-starburst-24",
      Wc: "fluent-color:bathroom-24",
      Baby: "fluent-color:person-24",
      FamilyRestroom: "fluent-color:people-24",
      Elevator: "fluent-color:elevator-24",
      Stairs: "fluent-color:building-multiple-24",
      Escalator: "fluent-color:building-multiple-24",
    };

    return fluentColorIconMap[name] || null;
  };

  // Get Material UI icon as fallback
  const getMaterialIcon = () => {
    // Try direct mapping first
    let MaterialIcon = MuiIcons[name];

    // If not found, try with 'Icon' suffix
    if (!MaterialIcon) {
      MaterialIcon = MuiIcons[`${name}Icon`];
    }

    // Common fallback mappings
    if (!MaterialIcon) {
      const fallbackMap = {
        NotificationBell: MuiIcons.Notifications,
        Campaign: MuiIcons.Campaign,
        Contacts: MuiIcons.Contacts,
        PersonAdd: MuiIcons.PersonAdd,
        PersonRemove: MuiIcons.PersonRemove,
        AdminPanelSettings: MuiIcons.AdminPanelSettings,
        KeyboardArrowUp: MuiIcons.KeyboardArrowUp,
        KeyboardArrowDown: MuiIcons.KeyboardArrowDown,
        ChevronLeft: MuiIcons.ChevronLeft,
        ChevronRight: MuiIcons.ChevronRight,
        ArrowBack: MuiIcons.ArrowBack,
        ArrowForward: MuiIcons.ArrowForward,
        VideoFile: MuiIcons.VideoFile,
        InsertDriveFile: MuiIcons.InsertDriveFile,
        CloudUpload: MuiIcons.CloudUpload,
        MoreVert: MuiIcons.MoreVert,
        LocationOn: MuiIcons.LocationOn,
        AccessTime: MuiIcons.AccessTime,
        CloudOff: MuiIcons.CloudOff,
        Article: MuiIcons.Article,
        Menu: MuiIcons.Menu,
      };

      MaterialIcon = fallbackMap[name];
    }

    return MaterialIcon || MuiIcons.HelpOutline;
  };

  // Try Fluent Color icon first, then fallback to Material UI
  const fluentColorIcon = getFluentColorIcon();

  if (fluentColorIcon) {
    return (
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          ...sx,
        }}
        onClick={onClick}
        {...props}
      >
        <Icon
          icon={fluentColorIcon}
          width={size}
          height={size}
          style={{
            color: color === "auto" ? undefined : color, // Let colorful icons use their natural colors
          }}
        />
      </Box>
    );
  }

  // Fallback to Material UI icon with better color handling
  const MaterialIcon = getMaterialIcon();
  return (
    <MaterialIcon
      sx={{
        fontSize: size,
        color: color === "auto" ? "primary.main" : color,
        ...sx,
      }}
      onClick={onClick}
      {...props}
    />
  );
};

export default FluentIcon;
