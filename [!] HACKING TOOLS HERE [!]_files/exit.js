var VERSION='20131003';    var AdvExit = (function() {      /*! JSON v3.2.2 | http://bestiejs.github.com/json3 | Copyright 2012, Kit Cambridge | http://kit.mit-license.org */
;(function () {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  // Detect the `define` function exposed by asynchronous module loaders and set
  // up the internal `JSON3` namespace. The strict equality check for `define`
  // is necessary for compatibility with the RequireJS optimizer (`r.js`).
  var isLoader = typeof define === "function" && define.amd, JSON3 = typeof exports == "object" && exports;

  // A JSON source string used to test the native `stringify` and `parse`
  // implementations.
  var serialized = '{"A":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';

  // Feature tests to determine whether the native `JSON.stringify` and `parse`
  // implementations are spec-compliant. Based on work by Ken Snyder.
  var stringifySupported, Escapes, toPaddedString, quote, serialize;
  var parseSupported, fromCharCode, Unescapes, Parser, lex, get, walk, update;

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var value = new Date(-3509827334573292), floor, Months, getDay;

  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    value = value.getUTCFullYear() == -109252 && value.getUTCMonth() === 0 && value.getUTCDate() == 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      value.getUTCHours() == 10 && value.getUTCMinutes() == 37 && value.getUTCSeconds() == 6 && value.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // Define additional utility methods if the `Date` methods are buggy.
  if (!value) {
    floor = Math.floor;
    // A mapping between the months of the year and the number of days between
    // January 1st and the first of the respective month.
    Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    // Internal: Calculates the number of days between the Unix epoch and the
    // first day of the given month.
    getDay = function (year, month) {
      return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
    };
  }

  // Export JSON 3 for asynchronous module loaders, CommonJS environments, web
  // browsers, and JavaScript engines. Credits: Oyvind Sean Kinsey.
  if (isLoader || JSON3) {
    if (isLoader) {
      // Export for asynchronous module loaders. The `JSON3` namespace is
      // redefined because module loaders do not provide the `exports` object.
      define("json", (JSON3 = {}));
    }
    if (typeof JSON == "object" && JSON) {
      // Delegate to the native `stringify` and `parse` implementations in
      // asynchronous module loaders and CommonJS environments.
      JSON3.stringify = JSON.stringify;
      JSON3.parse = JSON.parse;
    }
  } else {
    // Export for browsers and JavaScript engines.
    JSON3 = this.JSON || (this.JSON = {});
  }

  // Test `JSON.stringify`.
  if ((stringifySupported = typeof JSON3.stringify == "function" && !getDay)) {
    // A test function object with a custom `toJSON` method.
    (value = function () {
      return 1;
    }).toJSON = value;
    try {
      stringifySupported =
        // Firefox 3.1b1 and b2 serialize string, number, and boolean
        // primitives as object literals.
        JSON3.stringify(0) === "0" &&
        // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
        // literals.
        JSON3.stringify(new Number()) === "0" &&
        JSON3.stringify(new String()) == '""' &&
        // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
        // does not define a canonical JSON representation (this applies to
        // objects with `toJSON` properties as well, *unless* they are nested
        // within an object or array).
        JSON3.stringify(getClass) === undef &&
        // IE 8 serializes `undefined` as `"undefined"`. Safari 5.1.2 and FF
        // 3.1b3 pass this test.
        JSON3.stringify(undef) === undef &&
        // Safari 5.1.2 and FF 3.1b3 throw `Error`s and `TypeError`s,
        // respectively, if the value is omitted entirely.
        JSON3.stringify() === undef &&
        // FF 3.1b1, 2 throw an error if the given value is not a number,
        // string, array, object, Boolean, or `null` literal. This applies to
        // objects with custom `toJSON` methods as well, unless they are nested
        // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
        // methods entirely.
        JSON3.stringify(value) === "1" &&
        JSON3.stringify([value]) == "[1]" &&
        // YUI 3.0.0b1 fails to serialize `null` literals.
        JSON3.stringify(null) == "null" &&
        // FF 3.1b1, 2 halts serialization if an array contains a function:
        // `[1, true, getClass, 1]` serializes as "[1,true,],". These versions
        // of Firefox also allow trailing commas in JSON objects and arrays.
        // FF 3.1b3 elides non-JSON values from objects and arrays, unless they
        // define custom `toJSON` methods.
        JSON3.stringify([undef, getClass, null]) == "[null,null,null]" &&
        // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
        // where character escape codes are expected (e.g., `\b` => `\u0008`).
        JSON3.stringify({ "result": [value, true, false, null, "\0\b\n\f\r\t"] }) == serialized &&
        // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
        JSON3.stringify(null, value) === "1" &&
        JSON3.stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
        // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
        // serialize extended years.
        JSON3.stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
        // The milliseconds are optional in ES 5, but required in 5.1.
        JSON3.stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
        // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
        // four-digit years instead of six-digit years. Credits: @Yaffle.
        JSON3.stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
        // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
        // values less than 1000. Credits: @Yaffle.
        JSON3.stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
    } catch (exception) {
      stringifySupported = false;
    }
  }

  // Test `JSON.parse`.
  if (typeof JSON3.parse == "function") {
    try {
      // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
      // Conforming implementations should also coerce the initial argument to
      // a string prior to parsing.
      if (JSON3.parse("0") === 0 && !JSON3.parse(false)) {
        // Simple parsing test.
        value = JSON3.parse(serialized);
        if ((parseSupported = value.A.length == 5 && value.A[0] == 1)) {
          try {
            // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
            parseSupported = !JSON3.parse('"\t"');
          } catch (exception) {}
          if (parseSupported) {
            try {
              // FF 4.0 and 4.0.1 allow leading `+` signs, and leading and
              // trailing decimal points. FF 4.0, 4.0.1, and IE 9 also allow
              // certain octal literals.
              parseSupported = JSON3.parse("01") != 1;
            } catch (exception) {}
          }
        }
      }
    } catch (exception) {
      parseSupported = false;
    }
  }

  // Clean up the variables used for the feature tests.
  value = serialized = null;

  if (!stringifySupported || !parseSupported) {
    // Internal: Determines if a property is a direct property of the given
    // object. Delegates to the native `Object#hasOwnProperty` method.
    if (!(isProperty = {}.hasOwnProperty)) {
      isProperty = function (property) {
        var members = {}, constructor;
        if ((members.__proto__ = null, members.__proto__ = {
          // The *proto* property cannot be set multiple times in recent
          // versions of Firefox and SeaMonkey.
          "toString": 1
        }, members).toString != getClass) {
          // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
          // supports the mutable *proto* property.
          isProperty = function (property) {
            // Capture and break the object's prototype chain (see section 8.6.2
            // of the ES 5.1 spec). The parenthesized expression prevents an
            // unsafe transformation by the Closure Compiler.
            var original = this.__proto__, result = property in (this.__proto__ = null, this);
            // Restore the original prototype chain.
            this.__proto__ = original;
            return result;
          };
        } else {
          // Capture a reference to the top-level `Object` constructor.
          constructor = members.constructor;
          // Use the `constructor` property to simulate `Object#hasOwnProperty` in
          // other environments.
          isProperty = function (property) {
            var parent = (this.constructor || constructor).prototype;
            return property in this && !(property in parent && this[property] === parent[property]);
          };
        }
        members = null;
        return isProperty.call(this, property);
      };
    }

    // Internal: Normalizes the `for...in` iteration algorithm across
    // environments. Each enumerated key is yielded to a `callback` function.
    forEach = function (object, callback) {
      var size = 0, Properties, members, property, forEach;

      // Tests for bugs in the current environment's `for...in` algorithm. The
      // `valueOf` property inherits the non-enumerable flag from
      // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
      (Properties = function () {
        this.valueOf = 0;
      }).prototype.valueOf = 0;

      // Iterate over a new instance of the `Properties` class.
      members = new Properties();
      for (property in members) {
        // Ignore all properties inherited from `Object.prototype`.
        if (isProperty.call(members, property)) {
          size++;
        }
      }
      Properties = members = null;

      // Normalize the iteration algorithm.
      if (!size) {
        // A list of non-enumerable properties inherited from `Object.prototype`.
        members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
        // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
        // properties.
        forEach = function (object, callback) {
          var isFunction = getClass.call(object) == "[object Function]", property, length;
          for (property in object) {
            // Gecko <= 1.0 enumerates the `prototype` property of functions under
            // certain conditions; IE does not.
            if (!(isFunction && property == "prototype") && isProperty.call(object, property)) {
              callback(property);
            }
          }
          // Manually invoke the callback for each non-enumerable property.
          for (length = members.length; property = members[--length]; isProperty.call(object, property) && callback(property));
        };
      } else if (size == 2) {
        // Safari <= 2.0.4 enumerates shadowed properties twice.
        forEach = function (object, callback) {
          // Create a set of iterated properties.
          var members = {}, isFunction = getClass.call(object) == "[object Function]", property;
          for (property in object) {
            // Store each property name to prevent double enumeration. The
            // `prototype` property of functions is not enumerated due to cross-
            // environment inconsistencies.
            if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
              callback(property);
            }
          }
        };
      } else {
        // No bugs detected; use the standard `for...in` algorithm.
        forEach = function (object, callback) {
          var isFunction = getClass.call(object) == "[object Function]", property, isConstructor;
          for (property in object) {
            if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
              callback(property);
            }
          }
          // Manually invoke the callback for the `constructor` property due to
          // cross-environment inconsistencies.
          if (isConstructor || isProperty.call(object, (property = "constructor"))) {
            callback(property);
          }
        };
      }
      return forEach(object, callback);
    };

    // Public: Serializes a JavaScript `value` as a JSON string. The optional
    // `filter` argument may specify either a function that alters how object and
    // array members are serialized, or an array of strings and numbers that
    // indicates which properties should be serialized. The optional `width`
    // argument may be either a string or number that specifies the indentation
    // level of the output.
    if (!stringifySupported) {
      // Internal: A map of control characters and their escaped equivalents.
      Escapes = {
        "\\": "\\\\",
        '"': '\\"',
        "\b": "\\b",
        "\f": "\\f",
        "\n": "\\n",
        "\r": "\\r",
        "\t": "\\t"
      };

      // Internal: Converts `value` into a zero-padded string such that its
      // length is at least equal to `width`. The `width` must be <= 6.
      toPaddedString = function (width, value) {
        // The `|| 0` expression is necessary to work around a bug in
        // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
        return ("000000" + (value || 0)).slice(-width);
      };

      // Internal: Double-quotes a string `value`, replacing all ASCII control
      // characters (characters with code unit values between 0 and 31) with
      // their escaped equivalents. This is an implementation of the
      // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
      quote = function (value) {
        var result = '"', index = 0, symbol;
        for (; symbol = value.charAt(index); index++) {
          // Escape the reverse solidus, double quote, backspace, form feed, line
          // feed, carriage return, and tab characters.
          result += '\\"\b\f\n\r\t'.indexOf(symbol) > -1 ? Escapes[symbol] :
            // If the character is a control character, append its Unicode escape
            // sequence; otherwise, append the character as-is.
            symbol < " " ? "\\u00" + toPaddedString(2, symbol.charCodeAt(0).toString(16)) : symbol;
        }
        return result + '"';
      };

      // Internal: Recursively serializes an object. Implements the
      // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
      serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
        var value = object[property], className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, any;
        if (typeof value == "object" && value) {
          if (getClass.call(value) == "[object Date]" && !isProperty.call(value, "toJSON")) {
            if (value > -1 / 0 && value < 1 / 0) {
              // Dates are serialized according to the `Date#toJSON` method
              // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
              // for the ISO 8601 date time string format.
              if (getDay) {
                // Manually compute the year, month, date, hours, minutes,
                // seconds, and milliseconds if the `getUTC*` methods are
                // buggy. Adapted from @Yaffle's `date-shim` project.
                date = floor(value / 864e5);
                for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                date = 1 + date - getDay(year, month);
                // The `time` value specifies the time within the day (see ES
                // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                // to compute `A modulo B`, as the `%` operator does not
                // correspond to the `modulo` operation for negative numbers.
                time = (value % 864e5 + 864e5) % 864e5;
                // The hours, minutes, seconds, and milliseconds are obtained by
                // decomposing the time within the day. See section 15.9.1.10.
                hours = floor(time / 36e5) % 24;
                minutes = floor(time / 6e4) % 60;
                seconds = floor(time / 1e3) % 60;
                milliseconds = time % 1e3;
              } else {
                year = value.getUTCFullYear();
                month = value.getUTCMonth();
                date = value.getUTCDate();
                hours = value.getUTCHours();
                minutes = value.getUTCMinutes();
                seconds = value.getUTCSeconds();
                milliseconds = value.getUTCMilliseconds();
              }
              // Serialize extended years correctly.
              value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                // Months, dates, hours, minutes, and seconds should have two
                // digits; milliseconds should have three.
                "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                // Milliseconds are optional in ES 5.0, but required in 5.1.
                "." + toPaddedString(3, milliseconds) + "Z";
            } else {
              value = null;
            }
          } else if (typeof value.toJSON == "function") {
            value = value.toJSON(property);
          }
        }
        if (callback) {
          // If a replacement function was provided, call it to obtain the value
          // for serialization.
          value = callback.call(object, property, value);
        }
        if (value === null) {
          return "null";
        }
        className = getClass.call(value);
        if (className == "[object Boolean]") {
          // Booleans are represented literally.
          return "" + value;
        } else if (className == "[object Number]") {
          // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
          // `"null"`.
          return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
        } else if (className == "[object String]") {
          // Strings are double-quoted and escaped.
          return quote(value);
        }
        // Recursively serialize objects and arrays.
        if (typeof value == "object") {
          // Check for cyclic structures. This is a linear search; performance
          // is inversely proportional to the number of unique nested objects.
          for (length = stack.length; length--;) {
            if (stack[length] === value) {
              // Cyclic structures cannot be serialized by `JSON.stringify`.
              throw TypeError();
            }
          }
          // Add the object to the stack of traversed objects.
          stack.push(value);
          results = [];
          // Save the current indentation level and indent one additional level.
          prefix = indentation;
          indentation += whitespace;
          if (className == "[object Array]") {
            // Recursively serialize array elements.
            for (index = 0, length = value.length; index < length; any || (any = true), index++) {
              element = serialize(index, value, callback, properties, whitespace, indentation, stack);
              results.push(element === undef ? "null" : element);
            }
            return any ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
          } else {
            // Recursively serialize object members. Members are selected from
            // either a user-specified list of property names, or the object
            // itself.
            forEach(properties || value, function (property) {
              var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
              if (element !== undef) {
                // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                // is not the empty string, let `member` {quote(property) + ":"}
                // be the concatenation of `member` and the `space` character."
                // The "`space` character" refers to the literal space
                // character, not the `space` {width} argument provided to
                // `JSON.stringify`.
                results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
              }
              any || (any = true);
            });
            return any ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
          }
          // Remove the object from the traversed object stack.
          stack.pop();
        }
      };

      // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
      JSON3.stringify = function (source, filter, width) {
        var whitespace, callback, properties, length, value;
        if (typeof filter == "function" || typeof filter == "object" && filter) {
          if (getClass.call(filter) == "[object Function]") {
            callback = filter;
          } else if (getClass.call(filter) == "[object Array]") {
            // Convert the property names array into a makeshift set.
            properties = {};
            for (length = filter.length; length--; ((value = filter[length]) && (getClass.call(value) == "[object String]" || getClass.call(value) == "[object Number]")) && (properties[value] = 1));
          }
        }
        if (width) {
          if (getClass.call(width) == "[object Number]") {
            // Convert the `width` to an integer and create a string containing
            // `width` number of space characters.
            if ((width -= width % 1) > 0) {
              for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
            }
          } else if (getClass.call(width) == "[object String]") {
            whitespace = width.length <= 10 ? width : width.slice(0, 10);
          }
        }
        // Opera <= 7.54u2 discards the values associated with empty string keys
        // (`""`) only if they are used directly within an object member list
        // (e.g., `!("" in { "": 1})`).
        return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
      };
    }

    // Public: Parses a JSON source string.
    if (!parseSupported) {
      fromCharCode = String.fromCharCode;
      // Internal: A map of escaped control characters and their unescaped
      // equivalents.
      Unescapes = {
        "\\": "\\",
        '"': '"',
        "/": "/",
        "b": "\b",
        "t": "\t",
        "n": "\n",
        "f": "\f",
        "r": "\r"
      };

      // Internal: Returns the next token, or `"$"` if the parser has reached
      // the end of the source string. A token may be a string, number, `null`
      // literal, or Boolean literal.
      lex = function (options) {
        var source = options[0], length = source.length, symbol, value, begin, position, sign;
        while (options[1] < length) {
          symbol = source.charAt(options[1]);
          if ("\t\r\n ".indexOf(symbol) > -1) {
            // Skip whitespace tokens, including tabs, carriage returns, line
            // feeds, and space characters.
            options[1]++;
          } else if ("{}[]:,".indexOf(symbol) > -1) {
            // Parse a punctuator token at the current position.
            options[1]++;
            return symbol;
          } else if (symbol == '"') {
            // Advance to the next character and parse a JSON string at the
            // current position. String tokens are prefixed with the sentinel
            // `@` character to distinguish them from punctuators.
            for (value = "@", options[1]++; options[1] < length;) {
              symbol = source.charAt(options[1]);
              if (symbol < " ") {
                // Unescaped ASCII control characters are not permitted.
                throw SyntaxError();
              } else if (symbol == "\\") {
                // Parse escaped JSON control characters, `"`, `\`, `/`, and
                // Unicode escape sequences.
                symbol = source.charAt(++options[1]);
                if ('\\"/btnfr'.indexOf(symbol) > -1) {
                  // Revive escaped control characters.
                  value += Unescapes[symbol];
                  options[1]++;
                } else if (symbol == "u") {
                  // Advance to the first character of the escape sequence.
                  begin = ++options[1];
                  // Validate the Unicode escape sequence.
                  for (position = options[1] + 4; options[1] < position; options[1]++) {
                    symbol = source.charAt(options[1]);
                    // A valid sequence comprises four hexdigits that form a
                    // single hexadecimal value.
                    if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
                      // Invalid Unicode escape sequence.
                      throw SyntaxError();
                    }
                  }
                  // Revive the escaped character.
                  value += fromCharCode("0x" + source.slice(begin, options[1]));
                } else {
                  // Invalid escape sequence.
                  throw SyntaxError();
                }
              } else {
                if (symbol == '"') {
                  // An unescaped double-quote character marks the end of the
                  // string.
                  break;
                }
                // Append the original character as-is.
                value += symbol;
                options[1]++;
              }
            }
            if (source.charAt(options[1]) == '"') {
              options[1]++;
              // Return the revived string.
              return value;
            }
            // Unterminated string.
            throw SyntaxError();
          } else {
            // Parse numbers and literals.
            begin = options[1];
            // Advance the scanner's position past the sign, if one is
            // specified.
            if (symbol == "-") {
              sign = true;
              symbol = source.charAt(++options[1]);
            }
            // Parse an integer or floating-point value.
            if (symbol >= "0" && symbol <= "9") {
              // Leading zeroes are interpreted as octal literals.
              if (symbol == "0" && (symbol = source.charAt(options[1] + 1), symbol >= "0" && symbol <= "9")) {
                // Illegal octal literal.
                throw SyntaxError();
              }
              sign = false;
              // Parse the integer component.
              for (; options[1] < length && (symbol = source.charAt(options[1]), symbol >= "0" && symbol <= "9"); options[1]++);
              // Floats cannot contain a leading decimal point; however, this
              // case is already accounted for by the parser.
              if (source.charAt(options[1]) == ".") {
                position = ++options[1];
                // Parse the decimal component.
                for (; position < length && (symbol = source.charAt(position), symbol >= "0" && symbol <= "9"); position++);
                if (position == options[1]) {
                  // Illegal trailing decimal.
                  throw SyntaxError();
                }
                options[1] = position;
              }
              // Parse exponents.
              symbol = source.charAt(options[1]);
              if (symbol == "e" || symbol == "E") {
                // Skip past the sign following the exponent, if one is
                // specified.
                symbol = source.charAt(++options[1]);
                if (symbol == "+" || symbol == "-") {
                  options[1]++;
                }
                // Parse the exponential component.
                for (position = options[1]; position < length && (symbol = source.charAt(position), symbol >= "0" && symbol <= "9"); position++);
                if (position == options[1]) {
                  // Illegal empty exponent.
                  throw SyntaxError();
                }
                options[1] = position;
              }
              // Coerce the parsed value to a JavaScript number.
              return +source.slice(begin, options[1]);
            }
            // A negative sign may only precede numbers.
            if (sign) {
              throw SyntaxError();
            }
            // `true`, `false`, and `null` literals.
            if (source.slice(options[1], options[1] + 4) == "true") {
              options[1] += 4;
              return true;
            } else if (source.slice(options[1], options[1] + 5) == "false") {
              options[1] += 5;
              return false;
            } else if (source.slice(options[1], options[1] + 4) == "null") {
              options[1] += 4;
              return null;
            }
            // Unrecognized token.
            throw SyntaxError();
          }
        }
        // Return the sentinel `$` character if the parser has reached the end
        // of the source string.
        return "$";
      };

      // Internal: Parses a JSON `value` token.
      get = function (options, value) {
        var results, any, key;
        if (value == "$") {
          // Unexpected end of input.
          throw SyntaxError();
        }
        if (typeof value == "string") {
          if (value.charAt(0) == "@") {
            // Remove the sentinel `@` character.
            return value.slice(1);
          }
          // Parse object and array literals.
          if (value == "[") {
            // Parses a JSON array, returning a new JavaScript array.
            results = [];
            for (;; any || (any = true)) {
              value = lex(options);
              // A closing square bracket marks the end of the array literal.
              if (value == "]") {
                break;
              }
              // If the array literal contains elements, the current token
              // should be a comma separating the previous element from the
              // next.
              if (any) {
                if (value == ",") {
                  value = lex(options);
                  if (value == "}") {
                    // Unexpected trailing `,` in array literal.
                    throw SyntaxError();
                  }
                } else {
                  // A `,` must separate each array element.
                  throw SyntaxError();
                }
              }
              // Elisions and leading commas are not permitted.
              if (value == ",") {
                throw SyntaxError();
              }
              results.push(get(options, value));
            }
            return results;
          } else if (value == "{") {
            // Parses a JSON object, returning a new JavaScript object.
            results = {};
            for (;; any || (any = true)) {
              value = lex(options);
              // A closing curly brace marks the end of the object literal.
              if (value == "}") {
                break;
              }
              // If the object literal contains members, the current token
              // should be a comma separator.
              if (any) {
                if (value == ",") {
                  value = lex(options);
                  if (value == "}") {
                    // Unexpected trailing `,` in object literal.
                    throw SyntaxError();
                  }
                } else {
                  // A `,` must separate each object member.
                  throw SyntaxError();
                }
              }
              // Leading commas are not permitted, object property names must be
              // double-quoted strings, and a `:` must separate each property
              // name and value.
              if (value == "," || typeof value != "string" || value.charAt(0) != "@" || lex(options) != ":") {
                throw SyntaxError();
              }
              results[value.slice(1)] = get(options, lex(options));
            }
            return results;
          }
          // Unexpected token encountered.
          throw SyntaxError();
        }
        return value;
      };

      // Internal: Updates a traversed object member.
      update = function(source, property, callback) {
        var element = walk(source, property, callback);
        if (element === undef) {
          delete source[property];
        } else {
          source[property] = element;
        }
      };

      // Internal: Recursively traverses a parsed JSON object, invoking the
      // `callback` function for each value. This is an implementation of the
      // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
      walk = function (source, property, callback) {
        var value = source[property], length;
        if (typeof value == "object" && value) {
          if (getClass.call(value) == "[object Array]") {
            for (length = value.length; length--;) {
              update(value, length, callback);
            }
          } else {
            // `forEach` can't be used to traverse an array in Opera <= 8.54,
            // as `Object#hasOwnProperty` returns `false` for array indices
            // (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            forEach(value, function (property) {
              update(value, property, callback);
            });
          }
        }
        return callback.call(source, property, value);
      };

      // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
      JSON3.parse = function (source, callback) {
        var value = [source, 0], result = get(value, lex(value));
        // If a JSON string contains multiple tokens, it is invalid.
        if (lex(value) != "$") {
          throw SyntaxError();
        }
        return callback && getClass.call(callback) == "[object Function]" ? walk((value = {}, value[""] = result, value), "", callback) : result;
      };
    }
  }
}).call(this);
(function(/*! Stitch !*/) {
  if (!this.require) {
    var modules = {}, cache = {}, require = function(name, root) {
      var path = expand(root, name), module = cache[path], fn;
      if (module) {
        return module.exports;
      } else if (fn = modules[path] || modules[path = expand(path, './index')]) {
        module = {id: path, exports: {}};
        try {
          cache[path] = module;
          fn(module.exports, function(name) {
            return require(name, dirname(path));
          }, module);
          return module.exports;
        } catch (err) {
          delete cache[path];
          throw err;
        }
      } else {
        throw 'module \'' + name + '\' not found';
      }
    }, expand = function(root, name) {
      var results = [], parts, part;
      if (/^\.\.?(\/|$)/.test(name)) {
        parts = [root, name].join('/').split('/');
      } else {
        parts = name.split('/');
      }
      for (var i = 0, length = parts.length; i < length; i++) {
        part = parts[i];
        if (part == '..') {
          results.pop();
        } else if (part != '.' && part != '') {
          results.push(part);
        }
      }
      return results.join('/');
    }, dirname = function(path) {
      return path.split('/').slice(0, -1).join('/');
    };
    this.require = function(name) {
      return require(name, '');
    }
    this.require.define = function(bundle) {
      for (var key in bundle)
        modules[key] = bundle[key];
    };
  }
  return this.require.define;
}).call(this)({"backtracker": function(exports, require, module) {
/*
Track browser history to know if user pressed the back button
*/


(function() {
  var BackTracker, IframeBackTracker, PushStateBackTracker, Tracker, util,
    __slice = [].slice,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  util = require('util');

  if (typeof DEVMODE === 'undefined') {
    DEVMODE = true;

  }

  BackTracker = (function() {

    function BackTracker() {
      this._listeners = {};
    }

    BackTracker.prototype.log = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return util.log.apply(util, args);
    };

    BackTracker.prototype.trigger = function(name) {
      var handler, _i, _len, _ref, _results;
      if (this._listeners[name]) {
        _ref = this._listeners[name];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          handler = _ref[_i];
          _results.push(handler(name));
        }
        return _results;
      }
    };

    BackTracker.prototype.on = function(name, callback) {
      var _base;
      (_base = this._listeners)[name] || (_base[name] = []);
      return this._listeners[name].push(callback);
    };

    BackTracker.prototype.init = function(session, first) {
      if (first == null) {
        first = false;
      }
    };

    BackTracker.prototype.makeState = function(state) {
      state || (state = {});
      state.id = util.tid();
      state.time = new Date().getTime();
      state.url = document.location + '';
      return state;
    };

    return BackTracker;

  })();

  IframeBackTracker = (function(_super) {

    __extends(IframeBackTracker, _super);

    function IframeBackTracker() {
      this._onStateChange = __bind(this._onStateChange, this);
      IframeBackTracker.__super__.constructor.apply(this, arguments);
      this._waitingForExitingState = true;
    }

    IframeBackTracker.prototype._pushState = function(state, ignore) {
      var doc, html,
        _this = this;
      if (ignore == null) {
        ignore = false;
      }
      /*
          Add a state to the browsing history.
      */

      state = this.makeState(state);
      if (ignore) {
        this.ignoreState = state.id;
      }
      html = "<html><body><div id=\"state\">\n<script type=\"text/javascript\">\ntry {\n  window.parent." + this.backTrackerMethod + "({state: {__backtracker: " + (JSON.stringify(state)) + "}})\n}\ncatch (e) {\n}\n</script>\n</div></body></html>";
      this._frame || (this._frame = (function() {
        _this._frame = document.createElement("iframe");
        _this._frame.style.visibility = "hidden";
        _this._frame.style.position = "absolute";
        _this._frame.style.width = "1px";
        _this._frame.style.height = "1px";
        return document.body.appendChild(_this._frame);
      })());
      try {
        doc = this._frame.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        return true;
      } catch (e) {
        return false;
      }
    };

    IframeBackTracker.prototype.init = function(session, first) {
      var _this = this;
      if (first == null) {
        first = false;
      }
      if (this.inited) {
        return;
      }
      this.inited = true;
      this.backTrackerMethod = "__backTracker" + (session.id.replace(/-/g, ''));
      DEVMODE && this.log("=== Init back catcher with first: " + first + ", backTrackerMethod: " + this.backTrackerMethod);
      window[this.backTrackerMethod] = this._onStateChange;
      if (first) {
        this._pushState({
          action: 'exit'
        }, true);
        return this._pushState({
          action: 'site-top'
        });
      } else {
        return setTimeout((function() {
          if (_this._waitingForExitingState) {
            DEVMODE && _this.log("No existing state presented itself, creating new state");
            _this._pushState({
              action: 'back'
            }, true);
            return _this._pushState({
              action: 'page-top'
            });
          }
        }), 100);
      }
    };

    IframeBackTracker.prototype._onStateChange = function(event) {
      var exitAction, state, _ref;
      this._waitingForExitingState = false;
      if (!this.inited) {
        DEVMODE && this.log("statechange before init " + (JSON.stringify(event)));
        return;
      }
      state = event != null ? (_ref = event.state) != null ? _ref.__backtracker : void 0 : void 0;
      if (state && state.id === this.ignoreState) {
        DEVMODE && this.log("got ignore state " + (JSON.stringify(state)));
        this.ignoreState = null;
        return;
      }
      DEVMODE && this.log("statechange " + document.location + " " + (JSON.stringify(state)));
      if (!state) {
        return;
      }
      exitAction = state.action;
      DEVMODE && this.log("statechange action " + exitAction);
      if (exitAction === 'exit') {
        return this.trigger('exiting');
      } else if (exitAction === 'back') {
        return this.trigger('backing');
      } else if (exitAction === 'site-top') {
        return this.trigger('sitetop');
      } else if (exitAction === 'page-top') {

      } else {
        return DEVMODE && this.log('Unkown popstate');
      }
    };

    return IframeBackTracker;

  })(BackTracker);

  PushStateBackTracker = (function(_super) {

    __extends(PushStateBackTracker, _super);

    function PushStateBackTracker() {
      this._onStateChange = __bind(this._onStateChange, this);
      PushStateBackTracker.__super__.constructor.apply(this, arguments);
      util.listen(window, 'popstate', this._onStateChange);
      this.startState = history.state;
    }

    PushStateBackTracker.prototype.init = function(session, first) {
      var action, top, _ref, _ref1;
      if (first == null) {
        first = false;
      }
      if (this.inited) {
        return;
      }
      this.inited = true;
      DEVMODE && this.log("=== Init back catcher with first: " + first + ", state: " + (JSON.stringify(this.startState)));
      action = (_ref = this.startState) != null ? (_ref1 = _ref.__backtracker) != null ? _ref1.action : void 0 : void 0;
      if (action === 'page-top') {
        return DEVMODE && this.log('We are at entry point of the page');
      } else if (action === 'site-top') {
        return DEVMODE && this.log('We are at entry point of the site');
      } else if (action === 'exit' || action === 'back') {
        DEVMODE && this.log("Started on native " + action + " state, go forward");
        this.startState = null;
        return history.go(1);
      } else if (!action) {
        top = 'page-top';
        if (first) {
          DEVMODE && this.log('setup exit pushstates');
          this._replaceState({
            action: 'exit'
          });
          top = 'site-top';
        } else {
          DEVMODE && this.log('setup back pushstates');
          this._replaceState({
            action: 'back'
          });
        }
        return this._pushState({
          action: top
        });
      }
    };

    PushStateBackTracker.prototype._pushState = function(state) {
      return this.__changeState(history.pushState, state);
    };

    PushStateBackTracker.prototype._replaceState = function(state) {
      return this.__changeState(history.replaceState, state);
    };

    PushStateBackTracker.prototype.__changeState = function(method, state) {
      state = this.makeState(state);
      method.call(history, {
        __backtracker: state
      }, '', state.url);
      return state;
    };

    PushStateBackTracker.prototype._onStateChange = function(event) {
      var exitAction, state, _ref;
      if (!this.inited) {
        DEVMODE && this.log("statechange before init", event);
        return;
      }
      state = (_ref = history.state) != null ? _ref.__backtracker : void 0;
      DEVMODE && this.log("statechange " + document.location + " " + (JSON.stringify(state)));
      if (!state) {
        return;
      }
      if (this.startState && state.id === this.startState.id) {
        DEVMODE && this.log('We got startstate, ignore statechange');
        this.startState = null;
        return;
      }
      if (state.action) {
        exitAction = state.action;
      } else if (this.lastExitAction) {
        exitAction = this.lastExitAction;
        DEVMODE && this.log("Using last exit action " + this.lastExitAction);
      }
      this.lastExitAction = exitAction;
      DEVMODE && this.log("statechange action " + exitAction);
      if (exitAction === 'exit') {
        return this.trigger('exiting');
      } else if (exitAction === 'back') {
        return this.trigger('backing');
      } else if (exitAction === 'site-top') {
        return this.trigger('sitetop');
      } else if (exitAction === 'page-top') {

      } else {
        return DEVMODE && this.log('Unkown popstate');
      }
    };

    return PushStateBackTracker;

  })(BackTracker);

  if ('pushState' in history) {
    DEVMODE && util.log('using PushStateBackTracker');
    Tracker = PushStateBackTracker;
  } else {
    DEVMODE && util.log('using IframeBackTracker');
    Tracker = IframeBackTracker;
  }

  module.exports = Tracker;

}).call(this);
}, "config": function(exports, require, module) {
/*
The base URL where users should be taken to after exiting the site
*/


(function() {
  var ad_url, back_base_url, back_url, cookie_expire, cookie_name, url_204;

  back_base_url = 'https://wwv.scour.com/see/display.php';

  /*
  URL that simply has no content and returns a 204 status.
  This should be on the same host where the JS is
  */


  url_204 = 'https://exityield.advertise.com/204.html';

  /*
  Generate URL to call for ad requests
  cfg params:
  terms - terms used in search request or document title
  evoke:
    evoke=all â€“ This selection does not change the current functionality of the ad unit.
    evoke=searchback â€“ This selection only displays our ad unit if the user arrived
                       directly from a search engine and we were able to grab the keyword from the search.
  type - When passing a search engine term always pass â€œr=1â€�. When passing title data always pass â€œr=0â€�.
  */


  back_url = function(cfg) {
    var k, params, v;
    params = {};
    for (k in cfg) {
      v = cfg[k];
      if (v) {
        params[k] = encodeURIComponent(v);
      } else {
        params[k] = '';
      }
    }
    return ("" + back_base_url + "?q=" + (params.terms || '')) + ("&affid=" + params.affiliate + "&subid=" + params.subid) + ("&p=" + (params.p || 2) + "&r=" + (params.type || ''));
  };

  ad_url = function(cfg) {
    var k, params, protocol, v, _ref;
    params = {};
    for (k in cfg) {
      v = cfg[k];
      if (v) {
        params[k] = encodeURIComponent(v);
      } else {
        params[k] = '';
      }
    }
    protocol = 'http:';
    if ((typeof window !== "undefined" && window !== null ? (_ref = window.location) != null ? _ref.protocol : void 0 : void 0) === 'https:') {
      protocol = 'https:';
    }
    var ret= ("" + protocol + "//network.advertise.com/getJsonAds?Terms=" + (params.terms || '')) + ("&affiliate=" + params.affiliate + "&subid=" + params.subid) + "&serveurl=" + encodeURIComponent(document.location) +  "&Hits_Per_Page=1&output=full&backfill=false&product=ey";
//    alert("ret: " + ret);
    return ret;
  };

  /*
  Cookie name
  */


  cookie_name = '3e1dd89fdfa706ed2e69a8eccf98cab048d7b661';

  /*
  Cookie expire
  */


  cookie_expire = 60 * 60 * 3;

  module.exports = {
    ad_url: ad_url,
    back_url: back_url,
    cookie_name: cookie_name,
    cookie_expire: cookie_expire,
    url_204: url_204,
    debug: false
  };

}).call(this);
}, "cookie": function(exports, require, module) {// Copyright (c) 2012 Florian H., https://github.com/js-coder https://github.com/js-coder/cookie.js

!function (document, undefined) {

	var cookie = function () {
		return cookie.get.apply(cookie, arguments);
	};

	var utils = cookie.utils =  {

		// Is the given value an array? Use ES5 Array.isArray if it's available.
		isArray: Array.isArray || function (value) {
			return Object.prototype.toString.call(value) === '[object Array]';
		},

		// Is the given value a plain object / an object whose constructor is `Object`?
		isPlainObject: function (value) {
			return !!value && Object.prototype.toString.call(value) === '[object Object]';
		},

		// Convert an array-like object to an array â€“ for example `arguments`.
		toArray: function (value) {
			return Array.prototype.slice.call(value);
		},

		// Get the keys of an object. Use ES5 Object.keys if it's available.
		getKeys: Object.keys || function (obj) {
			var keys = [],
				 key = '';
			for (key in obj) {
				if (obj.hasOwnProperty(key)) keys.push(key);
			}
			return keys;
		},

		// Unlike JavaScript's built-in escape functions, this method
		// only escapes characters that are not allowed in cookies.
		escape: function (value) {
			return String(value).replace(/[,;"\\=\s%]/g, function (character) {
				return encodeURIComponent(character);
			});
		},

		// Return fallback if the value is not defined, otherwise return value.
		retrieve: function (value, fallback) {
			return value == null ? fallback : value;
		}

	};

	cookie.defaults = {};

	cookie.expiresMultiplier = 1; // Expire in miliseconds

	cookie.set = function (key, value, options) {

		if (utils.isPlainObject(key)) { // Then `key` contains an object with keys and values for cookies, `value` contains the options object.


			for (var k in key) { // TODO: `k` really sucks as a variable name, but I didn't come up with a better one yet.
				if (key.hasOwnProperty(k)) this.set(k, key[k], value);
			}

		} else {

			options = utils.isPlainObject(options) ? options : { expires: options };

			var expires = options.expires !== undefined ? options.expires : (this.defaults.expires || ''), // Empty string for session cookies.
			    expiresType = typeof(expires);

			if (expiresType === 'string' && expires !== '') expires = new Date(expires);
			else if (expiresType === 'number') expires = new Date(+new Date + 1000 * this.expiresMultiplier * expires); // This is needed because IE does not support the `max-age` cookie attribute.

			if (expires !== '' && 'toGMTString' in expires) expires = ';expires=' + expires.toGMTString();

			var path = options.path || this.defaults.path; // TODO: Too much code for a simple feature.
			path = path ? ';path=' + path : '';

			var domain = options.domain || this.defaults.domain;
			domain = domain ? ';domain=' + domain : '';

			var secure = options.secure || this.defaults.secure ? ';secure' : '';

			document.cookie = utils.escape(key) + '=' + utils.escape(value) + expires + path + domain + secure;

		}

		return this; // Return the `cookie` object to make chaining possible.

	};

	// TODO: This is commented out, because I didn't come up with a better method name yet. Any ideas?
	// cookie.setIfItDoesNotExist = function (key, value, options) {
	//	if (this.get(key) === undefined) this.set.call(this, arguments);
	// },

	cookie.remove = function (keys) {

		keys = utils.isArray(keys) ? keys : utils.toArray(arguments);

		for (var i = 0, l = keys.length; i < l; i++) {
			this.set(keys[i], '', -1);
		}

		return this; // Return the `cookie` object to make chaining possible.
	};

	cookie.empty = function () {

		return this.remove(utils.getKeys(this.all()));

	};

	cookie.get = function (keys, fallback) {

		fallback = fallback || undefined;
		var cookies = this.all();

		if (utils.isArray(keys)) {

			var result = {};

			for (var i = 0, l = keys.length; i < l; i++) {
				var value = keys[i];
				result[value] = utils.retrieve(cookies[value], fallback);
			}

			return result;

		} else return utils.retrieve(cookies[keys], fallback);

	};

	cookie.all = function () {

		if (document.cookie === '') return {};

		var cookies = document.cookie.split('; '),
			  result = {};

		for (var i = 0, l = cookies.length; i < l; i++) {
			var item = cookies[i].split('=');
			result[decodeURIComponent(item[0])] = decodeURIComponent(item[1]);
		}

		return result;

	};

	cookie.enabled = function () {

		if (navigator.cookieEnabled) return true;

		var ret = cookie.set('_', '_').get('_') === '_';
		cookie.remove('_');
		return ret;

	};

	// If an AMD loader is present use AMD.
	// If a CommonJS loader is present use CommonJS.
	// Otherwise assign the `cookie` object to the global scope.

	if (typeof define === 'function' && define.amd) {
		define(function () {
			return cookie;
		});
	} else if (typeof exports !== 'undefined') {
		exports.cookie = cookie;
	} else window.cookie = cookie;

}(document);
}, "domready": function(exports, require, module) {/*!
  * domready (c) Dustin Diaz 2012 - License MIT
  */
!function (name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()
}('domready', function (ready) {

  var fns = [], fn, f = false
    , doc = document
    , testEl = doc.documentElement
    , hack = testEl.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , addEventListener = 'addEventListener'
    , onreadystatechange = 'onreadystatechange'
    , readyState = 'readyState'
    , loaded = /^loade|c/.test(doc[readyState])

  function flush(f) {
    loaded = 1
    while (f = fns.shift()) f()
  }

  doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
    doc.removeEventListener(domContentLoaded, fn, f)
    flush()
  }, f)


  hack && doc.attachEvent(onreadystatechange, fn = function () {
    if (/^c/.test(doc[readyState])) {
      doc.detachEvent(onreadystatechange, fn)
      flush()
    }
  })

  return (ready = hack ?
    function (fn) {
      self != top ?
        loaded ? fn() : fns.push(fn) :
        function () {
          try {
            testEl.doScroll('left')
          } catch (e) {
            return setTimeout(function() { ready(fn) }, 50)
          }
          fn()
        }()
    } :
    function (fn) {
      loaded ? fn() : fns.push(fn)
    })
})}, "eventsupport": function(exports, require, module) {/**
 * @method isEventSupported
 * @param {String} eventName
 * @param {HTMLElement} element optional
 * @return {Boolean} true if event is supported
 *
 * Note that `isEventSupported` can give false positives when passed augmented host objects, e.g.:
 *
 *     someElement.onfoo = function(){ };
 *     isEventSupported('foo', someElement); // true (even if "foo" is not supported)
 *
 * Also note that in Gecko clients (those that utilize `setAttribute` -based detection) -
 *
 *     `isEventSupported('foo', someElement)`;
 *
 * - might create `someElement.foo` property (if "foo" event is supported) which apparently can not be deleted
 * `isEventSupported` sets such property to `undefined` value, but can not fully remove it
 *
 */
var isEventSupported = (function(undef) {

  var TAGNAMES = {
    'select':'input','change':'input',
    'submit':'form','reset':'form',
    'error':'img','load':'img','abort':'img'
  };

  function isEventSupported(eventName, element) {

    element = element || document.createElement(TAGNAMES[eventName] || 'div');
    eventName = 'on' + eventName;

    var isSupported = (eventName in element);

    if (!isSupported) {
      // if it has no `setAttribute` (i.e. doesn't implement Node interface), try generic element
      if (!element.setAttribute) {
        element = document.createElement('div');
      }
      if (element.setAttribute && element.removeAttribute) {
        element.setAttribute(eventName, '');
        isSupported = typeof element[eventName] == 'function';

        // if property was created, "remove it" (by setting value to `undefined`)
        if (typeof element[eventName] != 'undefined') {
          element[eventName] = undef;
        }
        element.removeAttribute(eventName);
      }
    }

    element = null;
    return isSupported;
  }
  return isEventSupported;
})();

module.exports = isEventSupported}, "exit": function(exports, require, module) {(function() {
  var BackTracker, EVOKE_ALL, EVOKE_BACK, EVOKE_PRE, EVOKE_SEARCHBACK, ExitHandler, ExitOverlay, KEYWORD_TERM, NO_ACTION, OPT_TERM, REDIRECT_ACTION, SEARCH_TERM, SESSION_EXPIRE, TITLE_TERM, config, cookie, domready, isEventSupported, jsonp, util,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice;

  cookie = (require('cookie')).cookie;

  config = require('config');

  util = require('util');

  ExitOverlay = require('exitoverlay');

  BackTracker = require('backtracker');

  domready = require('domready');

  jsonp = require('jsonp');

  if (typeof DEVMODE === 'undefined') {
    DEVMODE = true;

  }

  isEventSupported = require('eventsupport');

  SEARCH_TERM = 1;

  TITLE_TERM = 0;

  OPT_TERM = 0;

  KEYWORD_TERM = 0;

  NO_ACTION = 0;

  REDIRECT_ACTION = 1;

  EVOKE_ALL = 'all';

  EVOKE_BACK = 'back';

  EVOKE_SEARCHBACK = 'searchback';

  EVOKE_PRE = 'pre';

  SESSION_EXPIRE = 60 * 60;

  ExitHandler = (function() {

    function ExitHandler() {
      this.didEnactSiteTop = __bind(this.didEnactSiteTop, this);

      this.didEnactExit = __bind(this.didEnactExit, this);

      this.didEnactBack = __bind(this.didEnactBack, this);
      this.backTracker = new BackTracker();
      this.backTracker.on('exiting', this.didEnactExit);
      this.backTracker.on('backing', this.didEnactBack);
      this.backTracker.on('sitetop', this.didEnactSiteTop);
    }

    ExitHandler.prototype.log = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return util.log.apply(util, args);
    };

    ExitHandler.prototype.listen = function(target, event, f) {
      return util.listen.apply(util, arguments);
    };

    ExitHandler.prototype.normalizeUrl = function(url) {
      url = url.replace(/[&?\/]+$/, '');
      url = url.replace(/#.*$/, '');
      return url;
    };

    ExitHandler.prototype.onUnload = function(f) {
      var event, onbeforeunload, onunload;
      onunload = isEventSupported('unload', window);
      onbeforeunload = isEventSupported('beforeunload', window);
      if (onbeforeunload) {
        event = 'beforeunload';
      }
      if (onunload) {
        event || (event = 'unload');
      }
      if (!event) {
        DEVMODE && this.log('WARNING: could not detect unload event');
        return;
      }
      return this.listen(window, event, f);
    };

    ExitHandler.prototype.init = function(settings) {
      var host, k, refHost, referrer, _base, _ref,
        _this = this;
      this.settings = settings != null ? settings : {};
      config.debug = this.settings.debug;
      (_base = this.settings).evoke || (_base.evoke = EVOKE_BACK);
      this.settings.exitRedirect = this.settings.evoke === EVOKE_ALL;
      this.settings.exitOverlay = this.settings.evoke === EVOKE_PRE;
      this.settings.backRedirect = (_ref = this.settings.evoke) === EVOKE_ALL || _ref === EVOKE_BACK || _ref === EVOKE_SEARCHBACK;
      if (this.settings.opt) {
        this.settings.opt_keywords = this.settings.opt.split(',').slice(0, 5);
        this.settings.opt_keywords = (function() {
          var _i, _len, _ref1, _results;
          _ref1 = this.settings.opt_keywords;
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            k = _ref1[_i];
            if (k.trim().length > 0) {
              _results.push(k.trim());
            }
          }
          return _results;
        }).call(this);
        DEVMODE && this.log("Opt keywords " + (this.settings.opt_keywords.join(', ')));
      } else if (this.settings.keyword_hints) {
        this.settings.keywords = this.settings.keyword_hints.split(',').slice(0, 5);
        this.settings.keywords = (function() {
          var _i, _len, _ref1, _results;
          _ref1 = this.settings.keywords;
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            k = _ref1[_i];
            if (k.trim().length > 0) {
              _results.push(k.trim());
            }
          }
          return _results;
        }).call(this);
        DEVMODE && this.log("Keywords " + (this.settings.keywords.join(', ')));
      }
      this.onUnload(function() {});
      this.isIe = util.isIe();
      DEVMODE && this.isIe && this.log("IE version " + (util.ieVersion()));
      this.isAtTopUrl = false;
      this.historyLength = window.history.length;
      host = util.parseUrl(document.location).host;
      this.rootDomain = '.' + host.split('.').slice(-2).join('.');
      this.cameFromSite = false;
      if (document.referrer) {
        referrer = document.referrer.toString();
        if (referrer.indexOf('demo-search') === -1) {
          refHost = util.parseUrl(referrer).host;
          if (refHost === host || util.domainDiffCount(host, refHost) <= 1) {
            this.cameFromSite = true;
          }
        }
      }
      DEVMODE && this.log("----- INIT " + this.settings.evoke + " " + document.location + " " + this.rootDomain + " (history: " + this.historyLength + ", cameFromSite: " + this.cameFromSite + ", referrer: " + document.referrer + ")");
      return domready(function() {
//        return _this.checkVisit();
return _this.firstVisit();
      });
    };

    ExitHandler.prototype.session = function(cfg) {
      var item, sess;
      if (cfg) {
        sess = this.session() || {};
        cfg = util.extend(sess, cfg);
        cookie.set(config.cookie_name + '.session', JSON.stringify(cfg), {
          expires: '',
          domain: this.rootDomain
        });
        return cfg;
      }
      item = cookie.get(config.cookie_name + '.session');
      if (item) {
        sess = JSON.parse(item);
      }
      if (sess != null ? sess.id : void 0) {
        return sess;
      }
      return null;
    };

    ExitHandler.prototype.clearSession = function() {
      DEVMODE && this.log('Clear session');
      return cookie.remove(config.cookie_name + '.session');
    };

    ExitHandler.prototype.checkVisitNotUsed = function() {
      var sess, _ref, _ref1, _ref2;
      if (window.history.length <= 1) {

      } else {
        sess = this.session();
        DEVMODE && this.log('existing session', JSON.stringify(sess));
        if (sess) {
          if (sess.time < new Date().getTime() - (SESSION_EXPIRE * 1000)) {
            DEVMODE && this.log('session expired');
          } else if (document.referrer && !this.cameFromSite && (this.normalizeUrl(document.location.toString()) === sess.firstUrl && this.normalizeUrl(document.referrer) === sess.firstReferrer)) {
            if (((_ref = this.startState) != null ? _ref.id : void 0) === sess.firstState) {
              DEVMODE && this.log("We came from some other site state by id " + (JSON.stringify(this.startState)));
            } else if ((_ref1 = this.startState) != null ? (_ref2 = _ref1.data) != null ? _ref2.__exit__action : void 0 : void 0) {
              DEVMODE && this.log("We came from some other site state " + (JSON.stringify(this.startState)));
            } else {
              return this.firstVisit();
            }
            this.initBackCatcher();
            this.initCloseCatcher();
            this.initExitOverlayCatcher();
            return;
          } else {
            this.initBackCatcher();
            this.initCloseCatcher();
            this.initExitOverlayCatcher();
            return;
          }
        }
      }
      return this.firstVisit();
    };

    /*
      This is the first time we see a user, or at least they have no
      existing session. Start one.
    */


    ExitHandler.prototype.firstVisit = function() {
      var action, adUrl, evoke, init, terms, type, _ref,
        _this = this;
      evoke = this.settings.evoke;
      action = NO_ACTION;
      type = 0;
      if ((_ref = this.settings.opt_keywords) != null ? _ref.length : void 0) {
        terms = this.settings.opt_keywords[Math.floor(Math.random() * this.settings.opt_keywords.length)];
        type = OPT_TERM;
      } else {
        terms = this.getSearchReferrer();
        if (terms) {
          cookie.set(config.cookie_name, terms, {
            expires: config.cookie_expire,
            domain: this.rootDomain
          });
          type = SEARCH_TERM;
        } else if (evoke !== EVOKE_SEARCHBACK) {
          terms = cookie.get(config.cookie_name);
          if (terms) {
            type = SEARCH_TERM;
          }
        }
      }
//      if (!terms && evoke !== EVOKE_SEARCHBACK) {
//        type = KEYWORD_TERM;
//        terms = this.getKeyword();
//        DEVMODE && this.log("Using keyword term " + terms);
//      }
//      if (terms) {
//        action = REDIRECT_ACTION;
//        DEVMODE && this.log("Using terms " + terms);
//      } else {
//        DEVMODE && this.log('No terms so usign NO_ACTION');
//      }
        action = REDIRECT_ACTION;
      this.session({
        id: util.uuid(),
        evoke: evoke,
        terms: terms,
        termsType: type,
        action: action,
        firstHistory: window.history.length,
        firstUrl: this.normalizeUrl(document.location.toString()),
        firstReferrer: this.normalizeUrl(document.referrer),
        actionUrl: this.settings.actionUrl,
//        actionUrl: config.back_url({
//          affiliate: this.settings.affid,
//          subid: this.settings.subid,
//          terms: terms,
//          type: type
//        }),
        time: new Date().getTime(),
        exited: false,
        sawExitOverlay: false
      });
      init = function() {
        DEVMODE && _this.log('new session', JSON.stringify(_this.session()));
        _this.initBackCatcher(true);
        _this.initCloseCatcher();
        return _this.initExitOverlayCatcher();
      };
      if (this.settings.backRedirect && terms && action === REDIRECT_ACTION) {
        adUrl = config.ad_url({
          affiliate: this.settings.affid,
          subid: this.settings.subid,
          terms: terms,
          actionUrl: this.settings.actionUrl
        });
        
//        return jsonp(adUrl, function(err, response) {
//          var actionUrl, _ref1, _ref2, _ref3;
//          if (!err) {
//            actionUrl = response != null ? (_ref1 = response.dsxout) != null ? (_ref2 = _ref1.results) != null ? (_ref3 = _ref2.listing) != null ? _ref3.redirect : void 0 : void 0 : void 0 : void 0;
//            DEVMODE && _this.log('API loaded action url', actionUrl);
//            if (actionUrl) {
//                alert("setting action url in session : " + actionUrl);
//              _this.session({
//                actionUrl: actionUrl
//              });
//            }
//          }
//          return init();
//        });
      } else {
        return init();
      }
    };

    /*
      Check for intention to press back button
    */


    ExitHandler.prototype.initExitOverlayCatcher = function() {
      var session;
      if (!this.settings.exitOverlay) {
        return;
      }
      if (this.exitOverlay) {
        return;
      }
      session = this.session();
      this.exitOverlay = new ExitOverlay({
        handler: this,
        session: this.session
      });
      return this.exitOverlay.init(config.back_url({
        affiliate: this.settings.affid,
        subid: this.settings.subid,
        terms: session.terms,
        type: session.termsType,
        p: 3
      }));
    };

    /*
      Create history tracking frame.
    */


    ExitHandler.prototype.initBackCatcher = function(first) {
      var session;
      DEVMODE && this.log('initBackCatcher', this.settings.backRedirect || this.settings.exitOverlay || this.settings.exitRedirect);
      if (!(this.settings.backRedirect || this.settings.exitOverlay || this.settings.exitRedirect)) {
        return;
      }
      session = this.session();
      //if (session.action === REDIRECT_ACTION) {
      if (session !== null && session.action === REDIRECT_ACTION) {
        this.backTracker.init(session, first);
      }
    };

    ExitHandler.prototype.didEnactBack = function() {
      DEVMODE && this.log('Trying to back up');
      return this.goBack();
    };

    ExitHandler.prototype.goBack = function() {
      DEVMODE && this.log('Go back');
      return this.allowExit(function() {
        return history.go(-1);
      });
    };

    ExitHandler.prototype.didEnactExit = function() {
      var session,
        _this = this;
      session = this.session();
      if (this.settings.backRedirect && !session.exited) {
        DEVMODE && this.log('Trying to leave site');
        return this.allowExit(function() {
          var iframe, iframeDoc;
          _this.session({
            exited: true
          });
          if (_this.isIe) {
            iframe = document.createElement("iframe");
            iframe.style.visibility = "hidden";
            iframe.style.position = "absolute";
            iframe.style.width = "1px";
            iframe.style.height = "1px";
            document.body.appendChild(iframe);
            DEVMODE && _this.log('redirect by iframe');
            iframeDoc = iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.close();
            iframeDoc.open();
            iframeDoc.close();
            return window.location.replace(session.actionUrl);
          } else {
            return window.location.replace(session.actionUrl);
          }
        });
      } else {
        return this.goBack();
      }
    };

    ExitHandler.prototype.didEnactSiteTop = function() {
      DEVMODE && this.log('At first top');
      return this.isAtTopUrl = true;
    };

    /*
      Attempt to get search terms if reffered by a search engine.
    */


    ExitHandler.prototype.getSearchReferrer = function() {
      var host, q, ref, refHost, searchTerms;
      if (document.referrer) {
        ref = document.referrer.toString();
        refHost = util.parseUrl(ref).host;
        host = util.parseUrl(document.location).host;
        if (host !== refHost || ref.indexOf('demo-search') !== -1) {
          q = util.urlQueryParse(ref);
          searchTerms = q.q || q.p || q.query;
          if (searchTerms) {
            return searchTerms;
          }
        }
      }
    };

    /*
      Get keywords from title or settings.
    */


    ExitHandler.prototype.getKeyword = function() {
      var k, keywords;
      if (this.settings.keywords) {
        return this.settings.keywords[Math.floor(Math.random() * this.settings.keywords.length)];
      } else if (document.title) {
        keywords = document.title.split(/[,\.:|-]+/);
        keywords = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = keywords.length; _i < _len; _i++) {
            k = keywords[_i];
            if (k.trim()) {
              _results.push(k.trim());
            }
          }
          return _results;
        })();
        return keywords[0].toLowerCase();
      }
    };

    ExitHandler.prototype.initCloseCatcher = function() {
      var session, unload_url_count, unloading,
        _this = this;
      DEVMODE && this.log('initCloseCatcher', this.settings.exitRedirect);
      if (!this.settings.exitRedirect) {
        return;
      }
      if (this._initedCloseCatcher) {
        return;
      }
      this._initedCloseCatcher = true;
      session = this.session();
      if (session.exited) {
        DEVMODE && this.log('Already exited, ignoring exits');
        return;
      }
      if (session.action === REDIRECT_ACTION) {
        DEVMODE && this.log('register onbeforeunload close catcher');
        this.listen(document, 'click', function(e) {
          return _this.allowExit();
        });
        this.listen(window, 'blur', function(e) {
          var _ref;
          DEVMODE && _this.log('window blurred', e, document.activeElement, document.activeElement.nodeName);
          if (((_ref = document.activeElement.nodeName) != null ? _ref.toLowerCase() : void 0) === 'iframe') {
            DEVMODE && _this.log('Allow iframe exit');
            return _this._allowExit = true;
          }
        });
        this.listen(window, 'focus', function(e) {
          DEVMODE && _this.log('window focus', e, document.activeElement);
          return _this._allowExit = false;
        });
        this._leaving = false;
        unloading = 0;
        unload_url_count = 0;
        this.onUnload(function() {
          var i, _i, _ref;
          if (!_this._allowExit && ((_ref = document.activeElement.nodeName) != null ? _ref.toLowerCase() : void 0) !== 'iframe') {
            DEVMODE && _this.log("onExit unloading: " + unloading + ", leaving: " + _this._leaving);
            unloading++;
            for (i = _i = 1; _i <= 10; i = ++_i) {
              window.location.replace(config.url_204 + '?t=' + (new Date().getTime()) + '&i=' + unload_url_count++);
            }
          }
          _this._leaving = true;
        });
        setInterval((function() {
          if (!(unloading > 0 && _this._leaving && !_this._exited)) {
            return;
          }
          if (unloading <= 3) {
            window.location.replace(config.url_204 + '?t=' + (new Date().getTime()) + '&i=' + unload_url_count++);
          } else {
            _this._exited = true;
            _this.session({
              exited: true
            });
            window.location.assign(session.actionUrl);
          }
        }), 1);
        return DEVMODE && this.log('unload ready');
      }
    };

    ExitHandler.prototype.allowExit = function(f) {
      var _this = this;
      DEVMODE && this.log('enable allow exit');
      this._allowExit = true;
      if (this._allowExitTimer) {
        clearTimeout(this._allowExitTimer);
      }
      if (f) {
        setTimeout((function() {
          return f();
        }), 1);
      }
      return this._allowExitTimer = setTimeout((function() {
        if (!_this._leaving && _this._allowExit) {
          DEVMODE && _this.log('disable allow exit');
          return _this._allowExit = false;
        }
      }), 700);
    };

    return ExitHandler;

  })();

  module.exports = ExitHandler;

}).call(this);
}, "exitoverlay": function(exports, require, module) {(function() {
  var ALWAYS_SHOW, DOWN, ExitOverlay, MAX_TIME_DIFF, Mouse, SIDE_MARGIN, UP, util,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  util = require('util');

  if (typeof DEVMODE === 'undefined') {
    DEVMODE = true;

  }

  UP = 'up';

  DOWN = 'DOWN';

  ALWAYS_SHOW = false;

  MAX_TIME_DIFF = 250;

  SIDE_MARGIN = 1;

  Mouse = (function() {

    function Mouse(opts) {
      this.debugOverlay = opts.debugOverlay;
      this.isAtTopUrl = opts.isAtTopUrl;
      this._pos = [];
      this.isMovingTowardsBackButton = false;
      this.lastTime = +new Date();
    }

    Mouse.prototype.draw = function() {
      var indicatorClass,
        _this = this;
      if (!(this.debugOverlay && document.getElementsByClassName)) {
        return;
      }
      this.node || (this.node = (function() {
        var div, html;
        html = '<div class="back-button-area"></div>\n<div class="top-margin"></div>\n<div class="left-margin"></div>\n<div class="right-margin"></div>\n<div class="mouse-indicator"></div>\n<div class="debug-info"></div>';
        div = document.createElement('DIV');
        div.className = 'advexit-mouse-overlay';
        if (_this.isAtTopUrl) {
          div.className += ' top-url';
        }
        div.innerHTML = html;
        document.getElementsByTagName('BODY')[0].appendChild(div);
        _this.debugInfoNode = div.getElementsByClassName('debug-info')[0];
        _this.mouseIndicatorNode = div.getElementsByClassName('mouse-indicator')[0];
        _this.topMarginNode = div.getElementsByClassName('top-margin')[0];
        _this.backButtonAreaNode = div.getElementsByClassName('back-button-area')[0];
        return div;
      })());
      this.debugInfoNode.innerHTML = "<div class=\"info\">\n  <div>x,y: " + this.windowX + ", " + this.windowY + "</div>\n  <div>@withinMargin: " + this.withinMargin + "</div>\n  <div>@isMovingTowardsAddressBar: " + this.isMovingTowardsAddressBar + "</div>\n  <div>@isMovingTowardsBackButton: " + this.isMovingTowardsBackButton + "</div>\n  <div>@isCloseToTop: " + this.isCloseToTop + "</div>\n  <div>@isAtTopUrl: " + this.isAtTopUrl + "</div>\n</div>\n<div class=\"preview\">\n  <div class=\"back-button-area-active-preview\">Back button area - movement ignored</div>\n  <div class=\"margin-preview\">Mouse movement ignored here</div>\n  <div class=\"top-margin-preview\">Top margin - must cross to activate overlay</div>\n  <div class=\"moving-towards-address-bar-preview\">Movement towards address bar sensed</div>\n  <div class=\"moving-towards-back-button-preview\">Movement towards back button sensed</div>\n  <div class=\"will-activate-preview\">Will open overlay if top margin is crossed</div>\n</div>";
      indicatorClass = 'mouse-indicator';
      if (this.isMovingTowardsAddressBar) {
        indicatorClass += ' moving-towards-address-bar';
      }
      if (this.isMovingTowardsBackButton) {
        indicatorClass += ' moving-towards-back-button';
      }
      if (this.isMovingTowardsAddressBar && (!this.isMovingTowardsBackButton || this.isAtTopUrl)) {
        indicatorClass += ' will-activate';
      }
      this.mouseIndicatorNode.style.top = "" + this.windowY + "px";
      this.mouseIndicatorNode.style.left = "" + this.windowX + "px";
      this.mouseIndicatorNode.className = indicatorClass;
      this.topMarginNode.className = "top-margin " + (this.isCloseToTop ? 'active' : '');
      return this.backButtonAreaNode.className = "back-button-area " + (this.isMovingTowardsBackButton ? 'active' : '') + " " + (this.isAtTopUrl ? 'at-top-url' : '');
    };

    Mouse.prototype.lastPosition = function() {
      if (this._pos.length > 0) {
        return this._pos[-1];
      }
      return null;
    };

    Mouse.prototype.setPosition = function(x, y) {
      var current, i, prev, t, tDiff, xVelocities, yVelocities, _i, _len, _ref;
      t = +new Date();
      tDiff = t - this.lastTime;
      if (tDiff > MAX_TIME_DIFF) {
        DEVMODE && this.debugOverlay && util.log("reset pos tDiff: " + tDiff + ", " + this.lastTime);
        tDiff = 0;
        this._pos = [];
      }
      this.lastTime = t;
      this.windowX = x;
      this.windowY = y;
      this.x = this.windowX + util.scrollLeft();
      this.y = this.windowY + util.scrollTop();
      this.windowRight = util.clientWidth() - this.windowX;
      this._pos.push([tDiff, this.x, this.y]);
      this._pos = this._pos.slice(-5);
      if (this._pos.length >= 3) {
        yVelocities = 0;
        xVelocities = 0;
        _ref = this._pos.slice(1);
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          current = _ref[i];
          prev = this._pos[i];
          tDiff = current[0] || 1;
          yVelocities += (current[2] - prev[2]) / tDiff;
          xVelocities += (current[1] - prev[1]) / tDiff;
        }
        this.yVelocity = yVelocities / this._pos.length;
        this.xVelocity = xVelocities / this._pos.length;
      } else {
        this.yVelocity = 0;
        this.xVelocity = 0;
      }
      this.withinMargin = (this.windowX >= SIDE_MARGIN || this.windowX <= -1) && this.windowRight >= SIDE_MARGIN;
      this.isMovingTowardsAddressBar = this.yVelocity <= -0.02 && this.withinMargin;
      this.isMovingTowardsBackButton = this.x <= 150;
      this.isCloseToTop = this.windowY <= 5;
      if (isNaN(this.yVelocity)) {
        DEVMODE && util.log("isNaN(@yVelocity) yVelocities: " + yVelocities + ", pos: " + this._pos);
      }
      return this.draw();
    };

    Mouse.prototype.direction = function() {
      return {
        up: this.yVelocity <= -0.02,
        down: this.yVelocity >= 0.02,
        left: this.xVelocity <= -0.02,
        right: this.xVelocity >= 0.02
      };
    };

    return Mouse;

  })();

  ExitOverlay = (function() {

    function ExitOverlay(opts) {
      this.onMouseMove = __bind(this.onMouseMove, this);

      this.onMouseOut = __bind(this.onMouseOut, this);

      this.close = __bind(this.close, this);

      var _ref, _ref1, _ref2;
      this.session = opts.session;
      this.handler = opts.handler;
      if ((_ref = util.urlQueryParse(window.location)) != null ? _ref.debugOverlay : void 0) {
        this.session({
          debugOverlay: ((_ref1 = util.urlQueryParse(window.location)) != null ? _ref1.debugOverlay : void 0) === 'y'
        });
      }
      this.debugOverlay = (_ref2 = this.session()) != null ? _ref2.debugOverlay : void 0;
      if (this.debugOverlay) {
        this.injectCss();
      }
      this.mouse = new Mouse({
        debugOverlay: this.debugOverlay,
        isAtTopUrl: this.handler.isAtTopUrl
      });
      this.visible = false;
      this.focused = true;
    }

    ExitOverlay.prototype.injectCss = function() {
      var css, style;
      if (!this._cssInjected) {
        this._cssInjected = true;
        css = require('widget_css');
        if (document.createStyleSheet) {
          return document.createStyleSheet().cssText = css;
        } else {
          style = document.createElement('STYLE');
          style.type = 'text/css';
          style.innerHTML = css;
          return document.getElementsByTagName('BODY')[0].appendChild(style);
        }
      }
    };

    ExitOverlay.prototype.injectHtml = function() {
      var blackout, closeButton, content;
      if (!this.div) {
        this.div = document.createElement('DIV');
        this.div.className = 'advexit-widget';
        this.overlay = document.createElement('DIV');
        this.overlay.className = 'overlay hide';
        this.div.appendChild(this.overlay);
        blackout = document.createElement('DIV');
        blackout.className = 'blackout';
        this.overlay.appendChild(blackout);
        content = document.createElement('DIV');
        content.className = 'content';
        this.overlay.appendChild(content);
        closeButton = document.createElement('DIV');
        closeButton.className = 'close';
        closeButton.innerHTML = '&#215;';
        content.appendChild(closeButton);
        this.overlayIframe = document.createElement('IFRAME');
        this.overlayIframe.frameborder = 0;
        content.appendChild(this.overlayIframe);
        document.getElementsByTagName('BODY')[0].appendChild(this.div);
        return util.listen(closeButton, 'click', this.close);
      }
    };

    ExitOverlay.prototype.init = function(url) {
      var html, seen, _ref,
        _this = this;
      seen = (_ref = this.session()) != null ? _ref.sawExitOverlay : void 0;
      if (seen && !this.debugOverlay) {
        DEVMODE && util.log('Already saw ExitOverlay, not showing');
        return;
      }
      DEVMODE && util.log("Init ExitOverlay " + url);
      this.url = url;
      html = document.getElementsByTagName('HTML')[0];
      util.listen(html, 'mousemove', this.onMouseMove);
      util.listen(html, 'mouseout', this.onMouseOut);
      util.listen(window, 'blur', function(e) {
        return _this.focused = false;
      });
      return util.listen(window, 'focus', function(e) {
        return _this.focused = true;
      });
    };

    ExitOverlay.prototype.show = function() {
      var _ref;
      if ((((_ref = this.session()) != null ? _ref.sawExitOverlay : void 0) && !this.debugOverlay) || this.visible) {
        return;
      }
      this.session({
        sawExitOverlay: true
      });
      DEVMODE && util.log('Show ExitOverlay');
      this.visible = true;
      this.injectCss();
      this.injectHtml();
      this.overlayIframe.src = this.url;
      return this.overlay.className = 'overlay';
    };

    ExitOverlay.prototype.close = function() {
      this.overlay.className = 'overlay hide';
      return this.visible = false;
    };

    ExitOverlay.prototype.onMouseOut = function(e) {
      var from, isntIframe, x, y, _ref;
      e = e ? e : window.event;
      from = e.relatedTarget || e.toElement;
      isntIframe = !from || from.nodeName === "HTML";
      y = e.clientY;
      x = e.clientX;
      DEVMODE && this.debugOverlay && util.log(JSON.stringify({
        screenX: e.screenX,
        screenY: e.screenY,
        pageX: e.pageX,
        pageY: e.pageY,
        offsetX: e.offsetX,
        offsetY: e.offsetY,
        clientX: e.clientX,
        clientY: e.clientY
      }));
      if (y <= -1 && x <= -1) {
        x = ((_ref = this.mouse.lastPosition) != null ? _ref.x : void 0) || SIDE_MARGIN;
        DEVMODE && this.debugOverlay && util.log("IE onMouseOut using last X position " + x);
        this.mouse.setPosition(x, 0);
      } else if (y <= -1) {
        DEVMODE && this.debugOverlay && util.log("IE onMouseOut using Y position 0");
        this.mouse.setPosition(x, 0);
      } else {
        this.mouse.setPosition(x, y);
      }
      DEVMODE && this.debugOverlay && util.log("onMouseOut isntIframe: " + isntIframe + ", pos: " + x + "," + y + ", history: " + this.mouse._pos);
      if (isntIframe) {
        return this.showIfValidMouseMovement();
      }
    };

    ExitOverlay.prototype.onMouseMove = function(e) {
      var x, y;
      e = e ? e : window.event;
      y = e.clientY;
      x = e.clientX;
      this.mouse.setPosition(x, y);
      return this.showIfValidMouseMovement();
    };

    ExitOverlay.prototype.showIfValidMouseMovement = function() {
      if (this.mouse.isMovingTowardsAddressBar && this.mouse.isCloseToTop) {
        if (!this.mouse.isMovingTowardsBackButton || this.handler.isAtTopUrl) {
          return this.show();
        }
      }
    };

    return ExitOverlay;

  })();

  module.exports = ExitOverlay;

}).call(this);
}, "index": function(exports, require, module) {(function() {
  var config;

  config = require('config');

  if (!String.prototype.trim) {
    String.prototype.trim = function() {
      return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };
  }

  module.exports = {
    init: function(cfg) {
      var Obj, obj;
      Obj = require('exit');
      obj = new Obj();
      obj.init(cfg);
      return window.AdvExit = obj;
    }
  };

}).call(this);
}, "jsonp": function(exports, require, module) {(function() {
  var jsonp, noop, util;

  util = require('./util');

  noop = function() {};

  /*
   * JSONP handler
   *
   * Options:
   *  - param {String} qs parameter (`callback`)
   *  - timeout {Number} how long after a timeout error is emitted (`60000`)
   *
   * @param {String} url
   * @param {Object|Function} optional options / callback
   * @param {Function} optional callback
  */


  jsonp = function(url, opts, fn) {
    var callback, cleanup, executed, id, param, script, target, timeout, timer;
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }
    opts || (opts = {});
    param = opts.param || 'callback';
    timeout = opts.timeout || 30000;
    target = document.body;
    executed = false;
    id = util.uuid().replace(/-+/g, '');
    callback = "jsonp" + id;
    if (timeout) {
      timer = setTimeout((function() {
        cleanup();
        if (fn) {
          return fn(new Error('Timeout'));
        }
      }), timeout);
    }
    cleanup = function() {
      script.onload = script.onerror = script.onreadystatechange = null;
      script.parentNode.removeChild(script);
      window[callback] = noop;
      if (timer) {
        clearTimeout(timer);
      }
      return timer = null;
    };
    window[callback] = function(data) {
      console.log('callback', data);
      cleanup();
      executed = true;
      if (fn) {
        return fn(null, data);
      }
    };
    url += (url.indexOf('?') ? '&' : '?') + param + '=' + encodeURIComponent(callback);
    url = url.replace('?&', '?');
    url += "&t=" + ((new Date()).getTime());
    script = document.createElement('script');
    target.parentNode.insertBefore(script, target);
    script.onerror = function() {
      cleanup();
      if (fn) {
        return fn(new Error('Failure when loading'));
      }
    };
    script.onload = script.onreadystatechange = function() {
      var _ref;
      if (script.readyState && ((_ref = script.readyState) === 'loading' || _ref === 'uninitialized' || _ref === 'interactive')) {
        return;
      }
      if (!executed) {
        return setTimeout((function() {
          if (!executed) {
            cleanup();
            if (fn) {
              return fn(new Error('Failed to load'));
            }
          }
        }), 2000);
      }
    };
    script.async = true;
    return script.src = url;
  };

  module.exports = jsonp;

}).call(this);
}, "log": function(exports, require, module) {// Tell IE9 to use its built-in console
if (Function.prototype.bind && (typeof console === 'object' || typeof console === 'function') &&
  typeof console.log === "object"
  ) {
  var fixLog = function(){var a=this.console,b=a&&a.log,c=!b||b.call?0:a.log=function(){c.apply.call(b,a,arguments)}};
  fixLog();
}

// log() -- The complete, cross-browser (we don't judge!) console.log wrapper for his or her logging pleasure
if (!window.log) {
  window.log = function () {
    // Modern browsers
    if (typeof console !== 'undefined' && typeof console.log === 'function') {

      // Opera 11
      if (window.opera) {
        var i = 0;
        while (i < arguments.length) {
          console.log("Item " + (i+1) + ": " + arguments[i]);
          i++;
        }
      }

      // All other modern browsers
      else if ((Array.prototype.slice.call(arguments)).length == 1 && typeof Array.prototype.slice.call(arguments)[0] == 'string') {
        console.log( (Array.prototype.slice.call(arguments)).toString() );
      }
      else {
        console.log( Array.prototype.slice.call(arguments) );
      }

    }

    // IE8
    else if (!Function.prototype.bind && typeof console != 'undefined' && typeof console.log == 'object') {
      Function.prototype.call.call(console.log, console, Array.prototype.slice.call(arguments));
    }

    // IE7 and lower, and other old browsers
    else {
    }
  };
}}, "util": function(exports, require, module) {(function() {
  var clientWidth, compareDomains, config, domainDiffCount, extend, ieVersion, isIe, listen, log, parseUrl, scrollLeft, scrollTop, tid, urlQueryParse, uuid, _cachedIeVersion, _clientWidth, _scrollLeft, _scrollTop, _tid,
    __slice = [].slice;

  config = require('config');

  require('log');

  urlQueryParse = function(url) {
    var decode, match, query, search, urlParams, _ref;
    if (!url) {
      return null;
    }
    urlParams = {};
    search = /([^&=]+)=?([^&]*)/g;
    decode = function(s) {
      return decodeURIComponent(s.replace(/\+/g, " "));
    };
    query = (_ref = parseUrl(url).query) != null ? _ref.substring(1) : void 0;
    while (match = search.exec(query)) {
      urlParams[decode(match[1])] = decode(match[2]);
    }
    return urlParams;
  };

  parseUrl = function(url) {
    var a;
    if (!url) {
      return null;
    }
    a = document.createElement('a');
    a.href = url;
    return {
      source: url,
      protocol: a.protocol.replace(':', ''),
      host: a.hostname,
      port: a.port,
      query: a.search,
      hash: a.hash.replace('#', ''),
      path: a.pathname.replace(/^([^\/])/, '/$1')
    };
  };

  extend = exports.extend = function(object, properties) {
    var key, val;
    for (key in properties) {
      val = properties[key];
      object[key] = val;
    }
    return object;
  };

  uuid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r;
      r = Math.random() * 16 | 0;
      if (c === 'y') {
        r = r & 0x3 | 0x8;
      }
      return r.toString(16);
    });
  };

  _tid = 0;

  tid = function() {
    return "" + (new Date() * 1) + "-" + (_tid++);
  };

  /*
  Compare two domains and return the part that matches
  and a score of how much of it is different.
  
  Returns: [matching, diffa, diffb, score, diffcount]
  Example:
  
  >>> compareDomains('www.example.com', 'foo.example.com')
  ["example.com", "www", "foo", 0.6666666666666666, 1]
  >>> compareDomains('foo.example.com.hk', 'www.example.com.hk')
  ["example.com.hk", "foo", "www", 0.75, 1]
  >>> compareDomains('www.example.com', 'something.foo.example.com')
  ["example.com", "www", "something.foo", 0.5, 2]
  */


  compareDomains = function(a, b) {
    var adiff, ap, aparts, bdiff, bp, bparts, diff, i, same, _i, _ref;
    aparts = a.split('.').reverse();
    bparts = b.split('.').reverse();
    same = [];
    for (i = _i = 0, _ref = Math.min(aparts.length, bparts.length) - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
      ap = aparts[i];
      bp = bparts[i];
      if (ap === bp) {
        same.unshift(ap);
      } else {
        break;
      }
    }
    adiff = aparts.slice(same.length).reverse();
    bdiff = bparts.slice(same.length).reverse();
    diff = Math.max(adiff.length, bdiff.length);
    return [same.join('.'), adiff.join('.'), bdiff.join('.'), same.length / (same.length + diff), diff];
  };

  domainDiffCount = function(a, b) {
    var diffa, diffb, diffcount, matching, score, _ref;
    _ref = compareDomains(a, b), matching = _ref[0], diffa = _ref[1], diffb = _ref[2], score = _ref[3], diffcount = _ref[4];
    return diffcount;
  };

  listen = function(target, event, f) {
    try {
      if (target.addEventListener) {
        return target.addEventListener(event, f, false);
      } else if (target.attachEvent) {
        return target.attachEvent('on' + event, f);
      }
    } catch (e) {

    }
  };

  _scrollTop = null;

  scrollTop = function() {
    var body, doc;
    if (_scrollTop) {
      return _scrollTop();
    }
    if (typeof window.pageYOffset !== 'undefined') {
      _scrollTop = function() {
        return window.pageYOffset;
      };
    } else {
      body = document.body;
      doc = document.documentElement;
      doc = doc.clientHeight ? doc : body;
      _scrollTop = function() {
        return doc.scrollTop;
      };
    }
    return _scrollTop();
  };

  _scrollLeft = null;

  scrollLeft = function() {
    var body, doc;
    if (_scrollLeft) {
      return _scrollLeft();
    }
    if (typeof window.pageXOffset !== 'undefined') {
      _scrollLeft = function() {
        return window.pageXOffset;
      };
    } else {
      body = document.body;
      doc = document.documentElement;
      doc = doc.clientWidth ? doc : body;
      _scrollLeft = function() {
        return doc.scrollLeft;
      };
    }
    return _scrollLeft();
  };

  _clientWidth = null;

  clientWidth = function() {
    var body, doc;
    if (_clientWidth) {
      return _clientWidth();
    }
    body = document.body;
    doc = document.documentElement;
    doc = doc.clientWidth ? doc : body;
    _clientWidth = function() {
      return doc.clientWidth;
    };
    return _clientWidth();
  };

  log = function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (DEVMODE || config.debug) {
      window.log.apply(window, args);
    }
    return this;
  };

  _cachedIeVersion = null;

  ieVersion = function() {
    /*
      Get IE version
    */
    _cachedIeVersion || (_cachedIeVersion = (function() {
      var all, div, v;
      v = 3;
      div = document.createElement('div');
      all = div.getElementsByTagName('i');
      while ((div.innerHTML = "<!--[if gt IE " + (++v) + "]><i></i><![endif]-->") && all[0]) {}
      v = v > 4 ? v : null;
      return v;
    })());
    return _cachedIeVersion;
  };

  isIe = function() {
    /*
      Get IE version
    */
    return ieVersion() > 0;
  };

  module.exports = {
    isIe: isIe,
    ieVersion: ieVersion,
    extend: extend,
    urlQueryParse: urlQueryParse,
    parseUrl: parseUrl,
    uuid: uuid,
    compareDomains: compareDomains,
    domainDiffCount: domainDiffCount,
    listen: listen,
    scrollTop: scrollTop,
    scrollLeft: scrollLeft,
    clientWidth: clientWidth,
    log: log,
    tid: tid
  };

}).call(this);
}, "widget_css": function(exports, require, module) {(function() {

  module.exports = "/*\n* CleanSlate\n*   github.com/premasagar/cleanslate\n*\n*/.advexit-widget,.advexit-widget form,.advexit-widget div,.advexit-widget span,.advexit-widget input,.advexit-widget img,.advexit-widget a,.advexit-widget i{background-attachment:scroll !important;background-color:transparent !important;background-image:none !important;background-position:0 0 !important;background-repeat:repeat !important;border-color:black !important;border-color:currentColor !important;border-radius:0 !important;border-style:none !important;border-width:medium !important;bottom:auto !important;clear:none !important;clip:auto !important;color:inherit !important;counter-increment:none !important;counter-reset:none !important;cursor:auto !important;direction:inherit !important;display:inline !important;float:none !important;font-family:inherit !important;font-size:inherit !important;font-style:inherit !important;font-variant:normal !important;font-weight:inherit !important;height:auto !important;left:auto !important;letter-spacing:normal !important;line-height:inherit !important;list-style-type:inherit !important;list-style-position:outside !important;list-style-image:none !important;margin:0 !important;max-height:none !important;max-width:none !important;min-height:0 !important;min-width:0 !important;opacity:1;outline:invert none medium !important;overflow:visible !important;padding:0 !important;position:static !important;quotes:\"\" \"\" !important;right:auto !important;table-layout:auto !important;text-align:inherit !important;text-decoration:inherit !important;text-indent:0 !important;text-transform:none !important;top:auto !important;unicode-bidi:normal !important;vertical-align:baseline !important;visibility:inherit !important;white-space:normal !important;width:auto !important;word-spacing:normal !important;z-index:auto !important;-moz-border-radius:0 !important;-webkit-border-radius:0 !important}.advexit-widget,.advexit-widget form,.advexit-widget div{display:block !important}.advexit-widget a:hover{text-decoration:underline !important}.advexit-widget input,.advexit-widget select{vertical-align:middle !important}.advexit-widget select,.advexit-widget textarea,.advexit-widget input{border:1px solid #ccc !important}.advexit-widget{font-size:medium !important;line-height:1 !important;direction:ltr !important;text-align:left !important;font-family:Tahoma, Arial, san-serif !important;color:black !important;font-style:normal !important;font-weight:normal !important;text-decoration:none !important;list-style-type:disc !important}.advexit-widget.hide,.advexit-widget .hide{display:none !important}.advexit-widget .overlay{position:absolute;z-index:2147483646 !important}.advexit-widget .overlay .blackout{position:absolute !important;position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;background-color:black !important;z-index:1 !important;filter:progid:DXImageTransform.Microsoft.Alpha(Opacity=80) !important;opacity:0.8 !important}.advexit-widget .overlay .content{width:600px !important;position:absolute !important;position:fixed !important;top:40px !important;bottom:20% !important;left:50% !important;margin-left:-300px !important;background-color:white !important;z-index:2 !important;overflow:visible !important}.advexit-widget .overlay .content .close{position:absolute !important;top:-9px !important;right:-9px !important;width:18px !important;height:18px !important;color:white !important;font-weight:bold !important;margin:0 !important;padding:0 !important;background:black !important;font-size:12px !important;text-align:center !important;cursor:pointer !important;z-index:2 !important;-webkit-border-radius:18px !important;-moz-border-radius:18px !important;-ms-border-radius:18px !important;-o-border-radius:18px !important;border-radius:18px !important;border:2px solid #fff !important;line-height:16px !important}.advexit-widget .overlay .content .close:hover{background:red !important}.advexit-widget .overlay .content iframe{z-index:1 !important;overflow:hidden !important;border:none !important;position:absolute !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;width:100% !important;height:100% !important}.advexit-mouse-overlay .debug-info,.advexit-mouse-overlay .top-margin,.advexit-mouse-overlay .left-margin,.advexit-mouse-overlay .right-margin,.advexit-mouse-overlay .back-button-area,.advexit-mouse-overlay .mouse-indicator{z-index:2147483647 !important;position:fixed;pointer-events:none}.advexit-mouse-overlay .debug-info{right:0;top:0;width:300px;height:auto;border:1px solid black;box-sizing:border-box}.advexit-mouse-overlay .debug-info .info{padding:10px;background:#000;background:rgba(0,0,0,0.5);color:white}.advexit-mouse-overlay .debug-info .preview{padding:10px;background:#fff;background:rgba(255,255,255,0.8);color:black}.advexit-mouse-overlay .debug-info .preview div:before{box-sizing:border-box;width:16px;height:16px;display:inline-block;content:' ';border:1px solid black;margin-right:10px;vertical-align:middle}.advexit-mouse-overlay .debug-info .back-button-area-active-preview{background:rgba(0,255,255,0.2)}.advexit-mouse-overlay .debug-info .margin-preview{background:rgba(255,0,0,0.5)}.advexit-mouse-overlay .debug-info .top-margin-preview{background:rgba(171,108,157,0.5)}.advexit-mouse-overlay .debug-info .moving-towards-address-bar-preview:before{-webkit-border-radius:8px !important;-moz-border-radius:8px !important;-ms-border-radius:8px !important;-o-border-radius:8px !important;border-radius:8px !important;background:rgba(255,255,0,0.5)}.advexit-mouse-overlay .debug-info .moving-towards-back-button-preview:before{-webkit-border-radius:8px !important;-moz-border-radius:8px !important;-ms-border-radius:8px !important;-o-border-radius:8px !important;border-radius:8px !important;border:4px solid cyan !important}.advexit-mouse-overlay .debug-info .will-activate-preview:before{-webkit-border-radius:8px !important;-moz-border-radius:8px !important;-ms-border-radius:8px !important;-o-border-radius:8px !important;border-radius:8px !important;background:rgba(0,255,0,0.75)}.advexit-mouse-overlay .top-margin{right:0;top:0;width:100%;height:5px;background:#ab6c9d;filter:progid:DXImageTransform.Microsoft.Alpha(Opacity=50);opacity:0.5}.advexit-mouse-overlay .top-margin.active{background:lime}.advexit-mouse-overlay .left-margin,.advexit-mouse-overlay .right-margin{top:0;width:1px;height:100%;filter:progid:DXImageTransform.Microsoft.Alpha(Opacity=50);opacity:0.5;background:red}.advexit-mouse-overlay .right-margin{right:0}.advexit-mouse-overlay .left-margin{left:0}.advexit-mouse-overlay .back-button-area{top:0;left:0;width:150px;height:100%;box-sizing:border-box;background:none;background:rgba(0,255,255,0.2);border-right:1px solid cyan}.advexit-mouse-overlay .back-button-area.active{border-right:4px solid cyan}.advexit-mouse-overlay .back-button-area.at-top-url{display:none}.advexit-mouse-overlay .mouse-indicator{box-sizing:border-box;width:40px;height:40px;margin-left:5px;margin-top:5px;background:red;-webkit-border-radius:20px !important;-moz-border-radius:20px !important;-ms-border-radius:20px !important;-o-border-radius:20px !important;border-radius:20px !important;border:1px solid #000;filter:progid:DXImageTransform.Microsoft.Alpha(Opacity=50);opacity:0.5}.advexit-mouse-overlay .mouse-indicator.moving-towards-address-bar{background:#ff0}.advexit-mouse-overlay .mouse-indicator.moving-towards-back-button{border:4px solid cyan}.advexit-mouse-overlay .mouse-indicator.will-activate{background:lime}\n";

}).call(this);
}});
      return this.require('index');    }).call(this);  
