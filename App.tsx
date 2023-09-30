
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Button,
  Keyboard,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'APP_STORED_INFO';
const DRAGGABLE_HEIGHT = 50;
const ITEM_HEIGHT = 70;

function App(): JSX.Element {
  const [userHasPressed, setUserHasPressed] = useState(false);
  const [selectCompleted, setSelectCompleted] = useState(false);
  const kbVisibleRef = useRef(false);
  // const textMomentumRef = useRef(false);
  const [backKeyPress, setBackKeyPress] = useState(false);
  const pressRef = useRef<any>(undefined);
  const [items, setItems] = useState<Array<string | null>>([]);
  const [viewItem, setViewItem] = useState<{ idx: number, text: string, edit: boolean, noKb: boolean, cursor: { start: number, end?: number } } | undefined>();
  const viewItemRef = useRef<{ idx: number, text: string } | undefined>();
  const pan = useRef(new Animated.ValueXY()).current;
  const layoutRef = useRef<{ top: number, bottom: number }[]>([]);
  const scrollRef = useRef(0);
  const scrollViewRef = useRef<any>();
  const textScrollRef = useRef(0);
  const textScrollViewRef = useRef<any>();
  const [touch, setTouch] = useState<{ x: number, y: number } | undefined>();
  const touchRef = useRef<{ x: number, y: number } | undefined>();
  const [idxToMoveTo, setIdxToMoveTo] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => { // fixes eating touchableopacity on android
        return !!touchRef.current;
      },
      onPanResponderMove: Animated.event(
        [null, { dy: pan.y }],
        {
          useNativeDriver: false,
          listener: e => {
            if (touchRef.current && (e.nativeEvent as any).pageX) {
              const newMove = { x: (e.nativeEvent as any).pageX, y: (e.nativeEvent as any).pageY };
              for (let i = 0; i < layoutRef.current.length; i++) {
                const layout = layoutRef.current[i];
                if (layout && newMove.y >= layout.top - scrollRef.current && newMove.y <= layout.bottom - scrollRef.current) {
                  setIdxToMoveTo(i);
                  break;
                }
              }
            }
          },
        }),
      onPanResponderRelease: () => {
        setTouch(undefined);
        pan.resetAnimation();
      },
    }),
  ).current;
  const draggablePos = touch ? [{translateY: pan.y}, {translateY: (touch.y + (DRAGGABLE_HEIGHT / 2))}] : [];

  useEffect(() => {
    // just pressed back from viewing text, scroll now as ref was only now set to a rendered view
    if (
      typeof viewItem === 'undefined'
      && typeof viewItemRef.current !== 'undefined'
    ) {
      scrollViewRef.current?.scrollTo({ y: scrollRef.current, animated: false });
    }
  });

  useEffect(() => { touchRef.current = touch; }, [touch]);

  useEffect(() => { viewItemRef.current = viewItem }, [viewItem]);

  useEffect(() => {
    BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setBackKeyPress(true);
        return true;
      },
    );
    Keyboard.addListener('keyboardDidShow', e => {
      // const { height, screenX, screenY, width } = e.endCoordinates;
      kbVisibleRef.current = true;
    });
    Keyboard.addListener('keyboardDidHide', e => {
      kbVisibleRef.current = false;
    });

    try {
      AsyncStorage.getItem(KEY).then(val => {
        if (val !== null) {
          setItems(JSON.parse(val));
        }
      });
    } catch (e) {
      console.log(e);
    }
  }, []);

  useEffect(() => {
    if (backKeyPress) {
      if (viewItem && items[viewItem.idx] === '') {
        const newItems = [...items];
        newItems.splice(viewItem.idx, 1);
        setItems(newItems);
      }
      setViewItem(undefined);
      setBackKeyPress(false);
    }
  }, [backKeyPress]); // handle here to have up to date state

  useEffect(() => {
    try {
      AsyncStorage.setItem(KEY, JSON.stringify(items.filter(i => i !== null && i !== '')));
    } catch (e) {
      console.log(e);
    }
  }, [items]);

  useEffect(() => {
    if (
      selected !== null
      && (
        idxToMoveTo === selected + 1
        || selected === idxToMoveTo
      )
    ) {
      // intuitively would seem to be the same location based on UI, so skip
    }
    else if (
      typeof touch === 'undefined'
      && idxToMoveTo !== null
      && selected !== null
      && selected !== idxToMoveTo
    ) {
      const newItems = [...items];

      if (selected > idxToMoveTo) {
        // move everything in [idxToMoveTo, selected - 1] one idx up
        const temp = newItems[selected];

        for (let i = selected - 1; i >= idxToMoveTo; i--) {
          newItems[i + 1] = newItems[i];
        }
        newItems[idxToMoveTo] = temp;
      }
      else {
        const newIdx = idxToMoveTo - 1; // should actually use this in this case
        // move everything in [selected + 1, newIdx] one idx down
        const temp = newItems[selected];

        for (let i = selected + 1; i <= newIdx; i++) {
          newItems[i - 1] = newItems[i];
        }
        newItems[newIdx] = temp;
      }
      setSelected(null);
      setIdxToMoveTo(null);
      setItems(newItems);
    }
    else if (!touch && idxToMoveTo !== null) {
      setIdxToMoveTo(null);
    }
  }, [touch, selected, idxToMoveTo]);

  return (
    <>
    {
    typeof viewItem !== 'undefined'
      ? (
        <View
          style={{
            height: '100%',
            width: '100%',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: '100%',
              height: 50,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderColor: 'black',
              borderBottomWidth: 1,
              padding: 10,
              backgroundColor: '#ddd',
            }}
          >
            <View style={{ width: '50%' }}>
              <TouchableOpacity
                onPress={() => {
                  if (viewItem && items[viewItem.idx] === '') {
                    const newItems = [...items];
                    newItems.splice(viewItem.idx, 1);
                    setItems(newItems);
                  }
                  setViewItem(undefined);
                }}
              >
                <Text style={{ fontSize: 20 }}>{'\u{2190}'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'flex-end' }}>
              {viewItem?.edit && (
                <TouchableOpacity
                  style={{ paddingRight: 40 }}
                  onPress={() => {
                    if (viewItem) {
                      const newItems = items.map((i, idx) => {
                        if (idx === viewItem.idx) {
                          return viewItem.text;
                        }
                        return i;
                      });
                      setItems(newItems.filter(i => i !== null && i !== ''));
                    }
                    setViewItem(undefined);
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{'\u{2713}'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Delete?',
                    '',
                    [
                      {
                        text: 'Cancel'
                      },
                      {
                        text: 'OK',
                        onPress: () => {
                          if (viewItem) {
                            const newItems = [...items];
                            newItems.splice(viewItem.idx, 1);
                            setItems(newItems);
                          }
                          setViewItem(undefined);
                        },
                      }
                    ],
                  );
                }}
              >
                <Text style={{ fontSize: 20 }}>{'\u{1F5D1}'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            style={{
              height: '100%',
              width: '100%',
              padding: 10,
              // needed because the input first autosets selection to end
              // and the view laggily first scrolls up when loading
              display: selectCompleted ? 'flex' : 'none',
            }}
            ref={textScrollViewRef}
            onScroll={e => {
              textScrollRef.current = e.nativeEvent.contentOffset.y;
            }}
            // onMomentumScrollBegin={() => { textMomentumRef.current = true; }}
            // onMomentumScrollEnd={() => { textMomentumRef.current = false; }}
          >
            <View
              style={{
                paddingRight: 10,
                paddingLeft: 10,
                paddingTop: 0,
                paddingBottom: 55, // because of header
                height: '100%',
                width: '100%',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}
            >
              <TextInput
                autoFocus={true}
                multiline={true}
                showSoftInputOnFocus={!viewItem.noKb}
                selection={!userHasPressed ? { start: 0 } : viewItem.cursor}
                style={{ width: '100%' }}
                value={viewItem.text}
                onChangeText={text => {
                  setViewItem({...viewItem, edit: true, text});
                  setUserHasPressed(true);
                }}
                // only allow change after user has pressed
                onSelectionChange={e => {
                  if (userHasPressed) {
                    setViewItem({...viewItem, cursor: e.nativeEvent.selection});

                    if (pressRef.current && !kbVisibleRef.current) {
                      textScrollViewRef.current?.scrollTo({
                        y: textScrollRef.current + pressRef.current - 120,
                        animated: true,
                      });
                    }
                  }
                  if (!selectCompleted && e.nativeEvent.selection.start === 0) {
                    setSelectCompleted(true);
                  }
                }}
                onPressIn={e => {
                  setViewItem({...viewItem, noKb: false});
                  setUserHasPressed(true);
                  pressRef.current = e.nativeEvent.pageY;
                  // !kbVisibleRef.current && !textMomentumRef.current && textScrollViewRef.current?.scrollTo({
                  //   y: textScrollRef.current + e.nativeEvent.pageY - 120,
                  //   animated: true,
                  // });
                }}
              />
            </View>
          </ScrollView>
        </View>
      )
      : (
        // need onTouchEnd in case not moving after setting touch, in which case pan responder not called
        <View style={styles.appContainer} onTouchEnd={() => setTouch(undefined)}>
          <Animated.View
            style={styles.animateContainer}
            {...panResponder.panHandlers}
          >
            <ScrollView
              style={styles.scrollContainer}
              scrollEnabled={!touch}
              onScroll={e => { scrollRef.current = e.nativeEvent.contentOffset.y }}
              ref={scrollViewRef}
            >
              <View style={styles.listContainer}>
                {items.map((item, idx) => (
                  <View
                    style={styles.listItemContainer} key={`${item}_${idx}`}
                    onLayout={e => {
                      const { y, height } = e.nativeEvent.layout;
                      layoutRef.current[idx] = { top: y, bottom: y + height };
                    }}
                  >
                    <View
                      style={
                        (idx === selected && touch)
                          ? { ...styles.selectedListItem }
                          : { ...styles.listItem }
                        }
                    >
                      <TouchableOpacity
                        style={styles.touchable}
                        onPress={() => {
                          setViewItem({ idx, text: `${item}`, edit: false, cursor: { start: 0 }, noKb: true });
                          setUserHasPressed(false);
                          setSelectCompleted(false);
                        }}
                        onLongPress={e => {
                          setTouch({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
                          setSelected(idx);
                          touchRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; // set already to work asap

                          const newMove = { x: (e.nativeEvent as any).pageX, y: (e.nativeEvent as any).pageY };
                          for (let i = 0; i < layoutRef.current.length; i++) {
                            const layout = layoutRef.current[i];
                            if (layout && newMove.y >= layout.top - scrollRef.current && newMove.y <= layout.bottom - scrollRef.current) {
                              setIdxToMoveTo(i);
                              break;
                            }
                          }
                        }}
                      >
                        <Text
                          style={
                            (idx === selected && touch)
                              ? { color: '#eee' }
                              : { color: '#000' }
                            }
                        >
                          {`${item}`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View
                      style={
                        (
                          (selected !== null && idxToMoveTo !== null && idx === idxToMoveTo - 1)
                          && touch
                        )
                          ? styles.separator
                          : styles.separatorInvisible
                      }
                    >
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
            <View
              style={{
                backgroundColor: 'rgb(90, 150, 250)',
                height: 60,
                width: 60,
                borderRadius: 60,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                alignSelf: 'center',
                bottom: 40,
                right: 40,
                zIndex: 20,
                elevation: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setItems(['', ...items]);
                  setViewItem({ idx: 0, text: '', edit: true, cursor: { start: 0 }, noKb: false });
                  setUserHasPressed(false);
                  setSelectCompleted(true);
                }}
              >
                  <Text style={{ fontSize: 30, color: 'white' }}>+</Text>
              </TouchableOpacity>
            </View>
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: -DRAGGABLE_HEIGHT,
                zIndex: 10,
                height: DRAGGABLE_HEIGHT,
                width: '100%',
                transform: draggablePos,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={styles.box} />
            </Animated.View>
          </Animated.View>
        </View>
      )
    }
    </>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    width: '100%',
    height: '100%',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  animateContainer: {
    height: '100%',
    width: '100%',
  },
  scrollContainer: {
    width: '100%',
    height: '100%',
  },
  listContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    paddingTop: 10,
  },
  listItemContainer: {
    width: '100%',
    height: 'auto',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    width: '98%',
    height: ITEM_HEIGHT - 7,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbb',
    padding: 5,
    marginTop: 1,
  },
  selectedListItem: {
    width: '98%',
    height: ITEM_HEIGHT - 7,
    backgroundColor: '#eee',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 5,
    marginTop: 1,
  },
  separator: {
    width: '100%',
    height: 3,
    marginTop: 1,
    backgroundColor: 'rgb(90, 150, 250)',
  },
  separatorInvisible: {
    width: '100%',
    height: 3,
    marginTop: 1,
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  touchable: {
    width: '100%',
    flex: 1,
  },
  box: {
    height: DRAGGABLE_HEIGHT,
    width: '95%',
    backgroundColor: 'rgba(52, 52, 52, 0.5)',
  },
});

export default App;
